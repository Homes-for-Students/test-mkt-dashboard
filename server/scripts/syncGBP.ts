import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { google } from 'googleapis';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const DB_PATH = path.join(__dirname, '../config/propertiesDb.json');
const STATS_PATH = path.join(__dirname, '../config/gbpStats.json');
const TOKEN_PATH = path.join(__dirname, '../config/googleToken.json');

const DELAY_MS = 61000; // 61 seconds

interface GbpStats {
  lastSynced: string;
  properties: {
    [propertyId: string]: {
      reviews: number;
      rating: number;
      insights: {
        WEBSITE_CLICKS: Record<string, number>;
        CALL_CLICKS: Record<string, number>;
      };
    }
  }
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function formatDateKey(dateObj: { year?: number, month?: number, day?: number }): string {
  const y = dateObj.year || 2000;
  const m = String(dateObj.month || 1).padStart(2, '0');
  const d = String(dateObj.day || 1).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export async function syncGbpStats(forceSubsetForTesting?: number) {
  console.log('[syncGBP] Starting Google Business Profile sync...');
  let clientId = process.env.GBP_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
  let clientSecret = process.env.GBP_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET;
  let tokenPath = fs.existsSync(path.join(__dirname, '../config/gbpToken.json')) 
    ? path.join(__dirname, '../config/gbpToken.json') 
    : TOKEN_PATH;

  if (!fs.existsSync(DB_PATH) || !fs.existsSync(tokenPath)) {
    console.error('[syncGBP] Missing propertiesDb.json or token file');
    return;
  }
  if (!clientId || !clientSecret) {
    console.error('[syncGBP] Missing client ID or secret');
    return;
  }

  const tokens = JSON.parse(fs.readFileSync(tokenPath, 'utf8'));
  const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    'http://localhost:3000/api/google-auth/callback'
  );
  oauth2Client.setCredentials(tokens);

  const properties = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  const gbpProps = properties.filter((p: any) => p.googleBusinessProfileId);

  if (gbpProps.length === 0) {
    console.log('[syncGBP] No properties with googleBusinessProfileId found.');
    return;
  }

  let stats: GbpStats = { lastSynced: '', properties: {} };
  if (fs.existsSync(STATS_PATH)) {
    try {
      stats = JSON.parse(fs.readFileSync(STATS_PATH, 'utf8'));
    } catch (e) {}
  }

  const toDate = new Date();
  const fromDate = new Date();
  fromDate.setDate(toDate.getDate() - 180); // Fetch last 180 days

  const toSync = forceSubsetForTesting ? gbpProps.slice(0, forceSubsetForTesting) : gbpProps;

  for (let i = 0; i < toSync.length; i++) {
    const p = toSync[i];
    const locationId = p.googleBusinessProfileId;
    console.log(`[syncGBP] [${i + 1}/${toSync.length}] Syncing ${p.name}...`);

    let reviewsCount = 0;
    let avgRating = 0;
    const insightsData = { WEBSITE_CLICKS: {} as Record<string, number>, CALL_CLICKS: {} as Record<string, number> };

    try {
      // 1. Fetch Reviews
      try {
        const reviewsUrl = `https://mybusiness.googleapis.com/v4/${locationId}/reviews`;
        const reviewsRes = await oauth2Client.request({ url: reviewsUrl });
        const data = reviewsRes.data as any;
        if (data.totalReviewCount !== undefined) {
          reviewsCount = data.totalReviewCount;
          avgRating = data.averageRating || 0;
        } else {
          let allReviews = data.reviews || [];
          let nextPageToken = data.nextPageToken;
          
          // The API limits each page to 50 reviews. If totalReviewCount is missing, we MUST paginate to get the true count.
          while (nextPageToken) {
            try {
              const nextRes = await oauth2Client.request({ url: `${reviewsUrl}?pageToken=${nextPageToken}` });
              const nextData = nextRes.data as any;
              if (nextData.reviews) {
                allReviews = allReviews.concat(nextData.reviews);
              }
              nextPageToken = nextData.nextPageToken;
            } catch(e) {
              console.warn(`[syncGBP] Pagination failed:`, e);
              break;
            }
          }
          
          if (allReviews.length > 0) {
            reviewsCount = allReviews.length;
            let sumRating = 0;
            allReviews.forEach((r: any) => sumRating += (r.starRating === 'FIVE' ? 5 : r.starRating === 'FOUR' ? 4 : r.starRating === 'THREE' ? 3 : r.starRating === 'TWO' ? 2 : 1));
            avgRating = Number((sumRating / allReviews.length).toFixed(1));
          }
        }
      } catch (e: any) {
        console.warn(`[syncGBP] Reviews failed for ${p.name}:`, e?.response?.data?.error?.message || e.message);
      }

      // 2. Fetch Insights (Calls and Website Clicks)
      try {
        const perfLocationId = locationId.includes('accounts/') ? locationId.split('/').slice(2).join('/') : locationId;
        const insightsUrl = `https://businessprofileperformance.googleapis.com/v1/${perfLocationId}:fetchMultiDailyMetricsTimeSeries`;
        const params = new URLSearchParams();
        params.append('dailyMetrics', 'WEBSITE_CLICKS');
        params.append('dailyMetrics', 'CALL_CLICKS');
        params.append('dailyRange.start_date.year', String(fromDate.getFullYear()));
        params.append('dailyRange.start_date.month', String(fromDate.getMonth() + 1));
        params.append('dailyRange.start_date.day', String(fromDate.getDate()));
        params.append('dailyRange.end_date.year', String(toDate.getFullYear()));
        params.append('dailyRange.end_date.month', String(toDate.getMonth() + 1));
        params.append('dailyRange.end_date.day', String(toDate.getDate()));

        const insightsRes = await oauth2Client.request({ url: `${insightsUrl}?${params.toString()}` });
        const multiDailyMetrics = (insightsRes.data as any).multiDailyMetricTimeSeries || [];
        
        multiDailyMetrics.forEach((m: any) => {
           const seriesList = m.dailyMetricTimeSeries || [];
           seriesList.forEach((series: any) => {
              const metricName = series.dailyMetric;
              if (metricName === 'WEBSITE_CLICKS' || metricName === 'CALL_CLICKS') {
                 const datedValues = series.timeSeries?.datedValues || [];
                 datedValues.forEach((dv: any) => {
                   const dateKey = formatDateKey(dv.date);
                   const val = parseInt(dv.value || '0', 10);
                   insightsData[metricName as 'WEBSITE_CLICKS' | 'CALL_CLICKS'][dateKey] = val;
                 });
              }
           });
        });
      } catch (e: any) {
        console.warn(`[syncGBP] Insights failed for ${p.name}:`, e?.response?.data?.error?.message || e.message);
      }

      // Re-read to prevent overwriting external changes
      if (fs.existsSync(STATS_PATH)) {
        try {
          const freshStats = JSON.parse(fs.readFileSync(STATS_PATH, 'utf8'));
          stats.properties = { ...stats.properties, ...freshStats.properties };
        } catch (e) {}
      }

      // Only update stats object if we fetched valid data, keeping existing data otherwise
      if (reviewsCount > 0 || avgRating > 0 || Object.keys(insightsData.WEBSITE_CLICKS).length > 0) {
        stats.properties[p.id] = {
          reviews: reviewsCount,
          rating: avgRating,
          insights: insightsData
        };
      } else {
         console.log(`[syncGBP] No new data found for ${p.name}, keeping existing placeholders/data.`);
      }
      
      // Save incrementally so progress isn't lost if interrupted
      stats.lastSynced = new Date().toISOString();
      fs.writeFileSync(STATS_PATH, JSON.stringify(stats, null, 2));

    } catch (err: any) {
      console.error(`[syncGBP] Overall failure for ${p.name}:`, err.message);
    }

    // Wait exactly 61 seconds before next request, unless it's the last one
    if (i < toSync.length - 1) {
      console.log(`[syncGBP] Waiting ${DELAY_MS / 1000}s to bypass rate limits...`);
      await sleep(DELAY_MS);
    }
  }

  console.log('[syncGBP] Sync complete.');
}

// Removed standalone execution block as it breaks esbuild bundling.

