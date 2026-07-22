import axios from 'axios';
import { PORTFOLIO_SUMMARY } from '../../client/src/lib/mockData';
import { PropertyStore } from './propertyStore';
import { BetaAnalyticsDataClient } from '@google-analytics/data';
import { GoogleAdsApi } from 'google-ads-api';
import { google } from 'googleapis';

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pLimit from 'p-limit';
import NodeCache from 'node-cache';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const brandMappingsPath = path.join(__dirname, '../config/brandMappings.json');
let brandMappings: Record<string, any> = {};
if (fs.existsSync(brandMappingsPath)) {
  brandMappings = JSON.parse(fs.readFileSync(brandMappingsPath, 'utf8'));
}

// Environment variables
const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID || '';
const GOOGLE_SHEET_STUDENT_CROWD_ID = process.env.GOOGLE_SHEET_STUDENT_CROWD_ID || '';
const GOOGLE_ADS_CLIENT_ID = process.env.GOOGLE_ADS_CLIENT_ID || process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_ADS_CLIENT_SECRET = process.env.GOOGLE_ADS_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET || '';
const GOOGLE_ADS_DEVELOPER_TOKEN = process.env.GOOGLE_ADS_DEVELOPER_TOKEN || process.env.GOOGLE_DEVELOPER_TOKEN || '';
let GOOGLE_REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN || '';
const tokenPath = path.join(__dirname, '../config/googleToken.json');
if (!GOOGLE_REFRESH_TOKEN && fs.existsSync(tokenPath)) {
  try {
    const tokens = JSON.parse(fs.readFileSync(tokenPath, 'utf8'));
    if (tokens.refresh_token) {
      GOOGLE_REFRESH_TOKEN = tokens.refresh_token;
    }
  } catch (e) {
    // ignore
  }
}

// Caching and Concurrency
// Note: cache clears on container restart
const cache = new NodeCache({ stdTTL: 3600 }); // 1 hour cache to protect quotas
const limit = pLimit(5); // max 5 concurrent API requests to Google

// Initialize Google Analytics Data Client (Uses Application Default Credentials)
let analyticsDataClient: BetaAnalyticsDataClient | null = null;
try {
  analyticsDataClient = new BetaAnalyticsDataClient();
} catch (e) {
  console.log('[AnalyticsService] GA4 ADC not found, running in mock mode.');
}

// Initialize Google Search Console Auth
const gscAuth = new google.auth.GoogleAuth(
  process.env.GOOGLE_APPLICATION_CREDENTIALS
    ? { scopes: ['https://www.googleapis.com/auth/webmasters.readonly'] }
    : {
        keyFile: path.join(__dirname, '../../google-credentials.json'),
        scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
      }
);
const searchConsoleClient = google.searchconsole({ version: 'v1', auth: gscAuth });

// Initialize Google Ads Client (Requires explicit credentials in environment)
const GOOGLE_ADS_MANAGER_ID = process.env.GOOGLE_ADS_MANAGER_ID ? process.env.GOOGLE_ADS_MANAGER_ID.replace(/-/g, '') : undefined;

const googleAdsClient = (GOOGLE_ADS_CLIENT_ID && GOOGLE_ADS_CLIENT_SECRET && GOOGLE_ADS_DEVELOPER_TOKEN)
  ? new GoogleAdsApi({
      client_id: GOOGLE_ADS_CLIENT_ID,
      client_secret: GOOGLE_ADS_CLIENT_SECRET,
      developer_token: GOOGLE_ADS_DEVELOPER_TOKEN,
    })
  : null;

export interface ExecutiveStats {
  salesWeek: number;
  totalSales: number;
  occupancyRate: number;
  totalSalesGrowth?: number;
}

export interface ChannelPerformance {
  googleAds: {
    spend: number;
    searchImpShare: number;
    clicks: number;
    impressions: number;
    ctr: number;
    avgCpc: number;
    searches: number;
    searchTerms: Array<{ term: string; impr: number; clicks: number; ctr: number; avgCpc: number; cost: number }>;
  };
  metaAds: {
    spend: number;
    clicks: number;
    avgCpc: number;
  };
  googleMaps: {
    reviews: number;
    rating: number;
    phoneCalls: number;
    websiteVisits: number;
  };
  studentCrowd: {
    totalReviews: number;
    overallRating: number;
    reviewsLast30Days: number;
    ratingLast30Days: number;
  };
}

export interface GA4Metrics {
  usersData: Array<{ date: string; users: number; usersLastYear: number }>;
  engagementData: Array<{ date: string; bounceRate: number; sessionDuration: number }>;
  userSources: Array<{ source: string; users: number; avgSession: string; engagementRate: string }>;
  aiReferralData: Array<{ source: string; users: number; avgSession: string; engagementRate: string }>;
  usersByDay: Array<{ day: string; users: number }>;
  viewsByCountry: Array<{ country: string; views: number; percentage: string }>;
  viewsByDevice: Array<{ device: string; views: number; percentage: string; color: string }>;
  firstUserAcquisition?: Array<{ source: string; users: number; newUsers: number; avgSession: string; engagementRate: string }>;
  organicLandingPages?: Array<{ landingPage: string; users: number; views: number }>;
}

export class AnalyticsService {
  /**
   * Fetch Sales and Occupancy metrics from Google Sheet.
   */
  static async fetchGoogleSheetsMetrics(selectedCity: string, selectedPropertyIds: string[], selectedBrand?: string): Promise<ExecutiveStats> {
    const PROPERTIES = PropertyStore.getAll();
    let targetProps = selectedPropertyIds && selectedPropertyIds.length > 0 
         ? PROPERTIES.filter((p: any) => selectedPropertyIds.includes(p.id))
         : (selectedCity !== 'All' ? PROPERTIES.filter((p: any) => p.city === selectedCity) : PROPERTIES);
         
    if (selectedBrand && selectedBrand !== 'All Brands' && (!selectedPropertyIds || selectedPropertyIds.length === 0)) {
      targetProps = targetProps.filter((p: any) => p.brand === selectedBrand);
    }

    let totalSales = 0;
    let salesWeek = 0;
    let occupancyRate = 0;
    let totalSalesGrowth = 0;

    if (GOOGLE_SHEET_ID) {
      try {
        // Securely fetch using Application Default Credentials (ADC) on Cloud Run
        const auth = new google.auth.GoogleAuth({
          scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
        });
        const sheets = google.sheets({ version: 'v4', auth });
        
        console.log(`[AnalyticsService] Securely fetching Sales data from Google Sheet: ${GOOGLE_SHEET_ID}`);
        const response = await sheets.spreadsheets.values.get({
          spreadsheetId: GOOGLE_SHEET_ID,
          range: 'A:Z',
        });
        
        const rows = response.data.values;
        if (rows && rows.length > 0) {
           let headerRowIndex = -1;
           let headers: string[] = [];
           
           // Scan first 10 rows to find the header row
           for (let i = 0; i < Math.min(10, rows.length); i++) {
             const rowStrs = rows[i].map((h: any) => String(h).trim().toLowerCase());
             if (rowStrs.includes('property') && rowStrs.includes('stock')) {
               headerRowIndex = i;
               headers = rowStrs;
               break;
             }
           }

           if (headerRowIndex !== -1) {
             const propIdx = headers.indexOf('property');
             const currentWeekIdx = headers.indexOf('current week');
             const previousWeekIdx = headers.indexOf('previous week');
             const occupancyIdx = headers.indexOf('occupancy %');
             const stockIdx = headers.indexOf('stock');

             if (currentWeekIdx !== -1 && previousWeekIdx !== -1) {
                let sumCurrentWeek = 0;
                let sumPreviousWeek = 0;
                let sumOccupancy = 0;
                let sumStock = 0;
                let propertyCount = 0;

                const targetPropNames = targetProps.map((p: any) => p.name.toLowerCase().replace(/[^a-z0-9]/g, ''));

                for (let i = headerRowIndex + 1; i < rows.length; i++) {
                   const row = rows[i];
                   if (!row || row.length === 0) continue;
                   
                   const rowProp = String(row[propIdx] || '').toLowerCase().replace(/[^a-z0-9]/g, '');
                   
                   // Find if this row is an actual property from our selected pool
                   const isMatch = targetProps.some((p: any) => {
                     const targetClean = p.name.toLowerCase().replace(/[^a-z0-9]/g, '');
                     const targetNoThe = targetClean.startsWith('the') ? targetClean.substring(3) : targetClean;
                     const rowNoThe = rowProp.startsWith('the') ? rowProp.substring(3) : rowProp;
                     
                     // 1. Explicit mappings via googleSheetNames array in propertiesDb.json
                     if (p.googleSheetNames && Array.isArray(p.googleSheetNames)) {
                       return p.googleSheetNames.some((sheetName: string) => {
                         const mapClean = sheetName.toLowerCase().replace(/[^a-z0-9]/g, '');
                         return mapClean === rowProp;
                       });
                     }
                     
                     // 2. Strict exact match (ignoring 'the' prefix as fallback)
                     if (targetClean === rowProp || targetNoThe === rowNoThe) {
                       return true;
                     }
                     
                     return false;
                   });

                   // ONLY include the row if it's a confirmed property match.
                   // DO NOT sum indiscriminately (prevents double-counting "Grand Total" rows)
                   if (isMatch) {
                      const currentWeek = parseFloat(String(row[currentWeekIdx]).replace(/[^0-9.-]+/g,"")) || 0;
                      const previousWeek = parseFloat(String(row[previousWeekIdx]).replace(/[^0-9.-]+/g,"")) || 0;
                      
                      let stock = 0;
                      if (stockIdx !== -1 && row[stockIdx]) {
                          stock = parseFloat(String(row[stockIdx]).replace(/[^0-9.-]+/g,"")) || 0;
                      }
                      
                      let occRate = 0;
                      if (occupancyIdx !== -1 && row[occupancyIdx]) {
                         occRate = parseFloat(String(row[occupancyIdx]).replace(/[^0-9.-]+/g,"")) || 0;
                         // If it's 0.84 instead of 84%
                         if (!String(row[occupancyIdx]).includes('%') && occRate > 0 && occRate <= 1) {
                           occRate *= 100;
                         }
                      }
                      
                      sumCurrentWeek += currentWeek;
                      sumPreviousWeek += previousWeek;
                      sumOccupancy += occRate;
                      sumStock += stock;
                      propertyCount++;
                   }
                }

                if (propertyCount > 0) {
                   // Sales(week) = Current week - Previous week
                   salesWeek = sumCurrentWeek - sumPreviousWeek;
                   // Total sales = Current week
                   totalSales = sumCurrentWeek;
                   // OCCUPANCY %: Use weighted average if stock is available, else fallback to simple average
                   if (sumStock > 0) {
                     occupancyRate = Number(((sumCurrentWeek / sumStock) * 100).toFixed(1));
                   } else {
                     occupancyRate = Number((sumOccupancy / propertyCount).toFixed(1));
                   }
                   // Total Sales Growth = (Current - Previous) / Previous
                   totalSalesGrowth = sumPreviousWeek > 0 ? Number(((sumCurrentWeek - sumPreviousWeek) / sumPreviousWeek * 100).toFixed(1)) : 0;
                } else {
                   console.warn('[AnalyticsService] No properties matched, using scale factor fallback.');
                }
             } else {
               console.warn('[AnalyticsService] Could not find Current Week or Previous Week columns.');
             }
           } else {
             console.warn('[AnalyticsService] Could not find header row in Google Sheet.');
           }
        }
      } catch (err) {
        console.warn('[AnalyticsService] Failed to fetch Google Sheet data (likely ADC missing). Using dynamic mock fallback.', (err as Error).message);
      }
    }

    // Return the calculated data (live or mocked)
    return {
      salesWeek: Math.floor(salesWeek),
      totalSales: Math.floor(totalSales),
      occupancyRate: Number(occupancyRate.toFixed(1)),
      totalSalesGrowth
    };
  }

  /**
   * Fetch advertising channel breakdown statistics.
   */
  static async fetchChannelPerformance(selectedCity: string, selectedPropertyIds: string[], dateRange: { from: string; to: string }, selectedBrand?: string): Promise<ChannelPerformance> {
    const PROPERTIES = PropertyStore.getAll();
    const metrics: ChannelPerformance = {
      googleAds: {
        spend: 0, searchImpShare: 0, clicks: 0, impressions: 0, ctr: 0, avgCpc: 0, searches: 0, searchTerms: []
      },
      metaAds: {
        spend: 0, clicks: 0, avgCpc: 0,
      },
      googleMaps: {
        reviews: 0, rating: 0, phoneCalls: 0, websiteVisits: 0,
      },
      studentCrowd: {
        totalReviews: 0, overallRating: 0, reviewsLast30Days: 0, ratingLast30Days: 0,
      }
    };

    // Read Student Crowd data from background sync cache
    const STATS_PATH = path.join(__dirname, '../config/studentCrowdStats.json');
    if (fs.existsSync(STATS_PATH)) {
      try {
        const scStats = JSON.parse(fs.readFileSync(STATS_PATH, 'utf8'));
        const targetProps = selectedPropertyIds && selectedPropertyIds.length > 0 
           ? PROPERTIES.filter((p: any) => selectedPropertyIds.includes(p.id))
           : (selectedCity !== 'All' ? PROPERTIES.filter((p: any) => p.city === selectedCity) : PROPERTIES);
           
        let sumReviews = 0;
        let sumRating = 0;
        let ratingCount = 0;

        targetProps.forEach(p => {
          if (scStats[p.id]) {
            const propStats = scStats[p.id];
            if (propStats.totalReviews > 0) {
              sumReviews += propStats.totalReviews;
            }
            if (propStats.overallRating > 0) {
              sumRating += propStats.overallRating;
              ratingCount++;
            }
          }
        });

        if (sumReviews > 0 || ratingCount > 0) {
          metrics.studentCrowd.totalReviews = sumReviews;
          // Keep 2 decimal places as requested (e.g. 4.66)
          metrics.studentCrowd.overallRating = ratingCount > 0 ? Number((sumRating / ratingCount).toFixed(2)) : 0;
        }
      } catch (err) {
        console.warn('[AnalyticsService] Failed to read Student Crowd stats cache:', err);
      }
    }

    // Read from background synced Google Business Profile data
    const gbpStatsPath = path.join(__dirname, '../config/gbpStats.json');
    if (fs.existsSync(gbpStatsPath)) {
      try {
        const stats = JSON.parse(fs.readFileSync(gbpStatsPath, 'utf8'));
        
        let sumReviews = 0;
        let sumRating = 0;
        let ratingCount = 0;
        let sumPhoneCalls = 0;
        let sumWebsiteClicks = 0;

        const targetProps = selectedPropertyIds && selectedPropertyIds.length > 0 
           ? PROPERTIES.filter((p: any) => selectedPropertyIds.includes(p.id))
           : (selectedCity !== 'All' ? PROPERTIES.filter((p: any) => p.city === selectedCity) : PROPERTIES);

        const fromDateObj = new Date(dateRange.from);
        const toDateObj = new Date(dateRange.to);

        targetProps.forEach(p => {
          const propStats = stats.properties?.[p.id];
          if (propStats) {
            sumReviews += propStats.reviews || 0;
            if (propStats.rating > 0) {
              sumRating += propStats.rating;
              ratingCount++;
            }
            
            // Sum up insights within date range
            ['WEBSITE_CLICKS', 'CALL_CLICKS'].forEach(metricName => {
              const dailyData = propStats.insights?.[metricName] || {};
              for (const [dateStr, val] of Object.entries(dailyData)) {
                const d = new Date(dateStr);
                if (d >= fromDateObj && d <= toDateObj) {
                  if (metricName === 'WEBSITE_CLICKS') sumWebsiteClicks += (val as number);
                  if (metricName === 'CALL_CLICKS') sumPhoneCalls += (val as number);
                }
              }
            });
          }
        });

        if (sumReviews > 0 || ratingCount > 0) {
          metrics.googleMaps.reviews = sumReviews;
          metrics.googleMaps.rating = ratingCount > 0 ? Number((sumRating / ratingCount).toFixed(1)) : 0;
          metrics.googleMaps.phoneCalls = sumPhoneCalls;
          metrics.googleMaps.websiteVisits = sumWebsiteClicks;
        }

      } catch (err) {
        console.warn('[AnalyticsService] Failed to read GBP stats cache:', err);
      }
    }

    if (metrics.googleMaps.reviews === 0) {
      // Fallback: Attempt to fetch real Google Maps data using Places API
      const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || '';
      if (GOOGLE_MAPS_API_KEY) {
        try {
          const placeIds: string[] = [];
          const targetProps = selectedPropertyIds && selectedPropertyIds.length > 0 
             ? PROPERTIES.filter((p: any) => selectedPropertyIds.includes(p.id))
             : (selectedCity !== 'All' ? PROPERTIES.filter((p: any) => p.city === selectedCity) : PROPERTIES);
             
          targetProps.forEach(p => {
            if (p.googleMapsPlaceId) placeIds.push(p.googleMapsPlaceId);
          });

          if (placeIds.length > 0) {
            let sumReviews = 0;
            let sumRating = 0;
            let ratingCount = 0;
            
            await Promise.all(placeIds.map(async (placeId) => {
               try {
                 const res = await limit(() => axios.get(`https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=rating,user_ratings_total&key=${GOOGLE_MAPS_API_KEY}`));
                 const result = res.data.result;
                 if (result) {
                   sumReviews += (result.user_ratings_total || 0);
                   if (result.rating) {
                      sumRating += result.rating;
                      ratingCount++;
                   }
                 }
               } catch(err) {}
            }));

            if (sumReviews > 0 || ratingCount > 0) {
              metrics.googleMaps.reviews = sumReviews;
              metrics.googleMaps.rating = ratingCount > 0 ? Number((sumRating / ratingCount).toFixed(1)) : 0;
              // Note: phoneCalls and websiteVisits remain mocked as they require Google My Business API which needs OAuth
            }
          }
        } catch (err) {
          console.warn('[AnalyticsService] Google Maps API failed. Using fallback.');
        }
      }
    }

    // Attempt to fetch live Google Ads data if configured
    if (googleAdsClient && GOOGLE_REFRESH_TOKEN) {
      try {
        let activeBrands = new Set<string>();
        let targetProps = selectedPropertyIds && selectedPropertyIds.length > 0 
           ? PROPERTIES.filter((p: any) => selectedPropertyIds.includes(p.id))
           : (selectedCity !== 'All' ? PROPERTIES.filter((p: any) => p.city === selectedCity) : PROPERTIES);

        if (selectedBrand && selectedBrand !== 'All Brands' && (!selectedPropertyIds || selectedPropertyIds.length === 0)) {
          targetProps = targetProps.filter((p: any) => p.brand === selectedBrand);
        }

        targetProps.forEach(p => activeBrands.add(p.brand));
        
        const googleAdsCustomerIds: string[] = [];
        Array.from(activeBrands).forEach(brand => {
           const mapping = brandMappings[brand];
           if (mapping?.googleAdsCustomerId) googleAdsCustomerIds.push(mapping.googleAdsCustomerId);
        });

        if (googleAdsCustomerIds.length > 0) {
          console.log(`[AnalyticsService] Google Ads customer IDs to query:`, googleAdsCustomerIds);
          let totalSpend = 0, totalClicks = 0, totalImpressions = 0, totalPossibleImpressions = 0;
          const targetPropNames = targetProps.map((p: any) => {
            let name = p.name.toLowerCase();
            if (p.brand === 'UKSH' && name.startsWith('wak ')) {
              name = name.replace('wak ', '');
            }
            return name.replace(/[^a-z0-9]/g, '');
          });

          await Promise.all(googleAdsCustomerIds.map(async (customerId) => {
             const cleanId = customerId.replace(/-/g, '');
              try {
                const customer = googleAdsClient.Customer({ 
                  customer_id: cleanId, 
                  refresh_token: GOOGLE_REFRESH_TOKEN,
                  login_customer_id: GOOGLE_ADS_MANAGER_ID
                });
                
                // Format dates to YYYY-MM-DD
                const fromDate = dateRange.from.split('T')[0];
                const toDate = dateRange.to.split('T')[0];
                const dateQuery = `BETWEEN '${fromDate}' AND '${toDate}'`;

                const adsData = await customer.query(`SELECT campaign.name, metrics.cost_micros, metrics.clicks, metrics.impressions, metrics.search_impression_share FROM campaign WHERE segments.date ${dateQuery}`);
                
                for await (const row of adsData) {
                   const campaignName = String(row.campaign?.name || '').toLowerCase();
                   
                   // Exclude inactive campaigns starting with zzz
                   if (campaignName.startsWith('zzz')) continue;

                   const campaignNameClean = campaignName.replace(/[^a-z0-9]/g, '');
                   
                   // Strict property match
                   const isMatch = targetPropNames.some((targetName: any) => 
                      (campaignNameClean.includes(targetName) || targetName.includes(campaignNameClean)) && campaignNameClean.length > 3
                   );

                   if (isMatch) {
                      const impressions = (row.metrics?.impressions || 0);
                      totalSpend += ((row.metrics?.cost_micros || 0) / 1000000);
                      totalClicks += (row.metrics?.clicks || 0);
                      totalImpressions += impressions;
                      
                      const impShare = row.metrics?.search_impression_share;
                      if (impShare != null && impShare > 0) {
                         totalPossibleImpressions += (impressions / impShare);
                      }
                   }
                }
             } catch (err: any) {
               console.warn(`[AnalyticsService] Google Ads API failed for customer ${customerId}:`, err.message || err);
             }
          }));

          // Override mock data with real data
          metrics.googleAds.spend = Math.floor(totalSpend);
          metrics.googleAds.clicks = totalClicks;
          metrics.googleAds.impressions = totalImpressions;
          metrics.googleAds.ctr = totalImpressions > 0 ? Number(((totalClicks / totalImpressions) * 100).toFixed(1)) : 0;
          metrics.googleAds.avgCpc = totalClicks > 0 ? Number((totalSpend / totalClicks).toFixed(2)) : 0;
          metrics.googleAds.searches = Math.floor(totalPossibleImpressions);
          metrics.googleAds.searchImpShare = totalPossibleImpressions > 0 ? Number(((totalImpressions / totalPossibleImpressions) * 100).toFixed(1)) : 0;
        }
      } catch (err) {
         console.warn('[AnalyticsService] Google Ads API failed. Using fallback data.');
      }
    }

    const META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN || '';

    // Attempt to fetch live Meta Ads data if configured
    if (META_ACCESS_TOKEN) {
      try {
        let activeBrands = new Set<string>();
        const targetProps = selectedPropertyIds && selectedPropertyIds.length > 0 
           ? PROPERTIES.filter((p: any) => selectedPropertyIds.includes(p.id))
           : (selectedCity !== 'All' ? PROPERTIES.filter((p: any) => p.city === selectedCity) : PROPERTIES);

        targetProps.forEach(p => activeBrands.add(p.brand));
        
        const metaAdAccountIds: string[] = [];
        Array.from(activeBrands).forEach(brand => {
           const mapping = brandMappings[brand];
           if (mapping?.metaAdAccountId) metaAdAccountIds.push(mapping.metaAdAccountId);
        });

        console.log(`[AnalyticsService] Meta Ads Access Token found. Querying accounts:`, metaAdAccountIds);

        if (metaAdAccountIds.length > 0) {
          let totalSpend = 0, totalClicks = 0;
          const fromDate = dateRange.from.split('T')[0];
          const toDate = dateRange.to.split('T')[0];

          await Promise.all(metaAdAccountIds.map(async (accountId) => {
             try {
                // Determine API URL for insights
                const apiUrl = `https://graph.facebook.com/v19.0/act_${accountId}/insights`;
                console.log(`[AnalyticsService] Fetching from ${apiUrl}`);
                const response = await limit(() => axios.get(apiUrl, {
                  params: {
                    access_token: META_ACCESS_TOKEN,
                    fields: 'campaign_name,spend,clicks',
                    time_range: JSON.stringify({ since: fromDate, until: toDate }),
                    level: 'campaign'
                  }
                }));

                const data = response.data.data;
                const targetPropNames = targetProps.map((p: any) => {
                  let name = p.name.toLowerCase();
                  if (p.brand === 'UKSH' && name.startsWith('wak ')) {
                    name = name.replace('wak ', '');
                  }
                  return name.replace(/[^a-z0-9]/g, '');
                });
                
                if (data && data.length > 0) {
                  for (let i = 0; i < data.length; i++) {
                     const campaignName = String(data[i].campaign_name || '').toLowerCase();
                     
                     // Exclude inactive campaigns starting with zzz
                     if (campaignName.startsWith('zzz')) continue;
                     
                     const campaignNameClean = campaignName.replace(/[^a-z0-9]/g, '');
                     
                     // Strict property match
                     const isMatch = targetPropNames.some((targetName: any) => 
                        (campaignNameClean.includes(targetName) || targetName.includes(campaignNameClean)) && campaignNameClean.length > 3
                     );
                     
                     if (isMatch) {
                        totalSpend += parseFloat(data[i].spend || 0);
                        totalClicks += parseInt(data[i].clicks || 0, 10);
                     }
                  }
                }
             } catch (err: any) {
               console.warn(`[AnalyticsService] Meta Ads API failed for account ${accountId}. Error: ${err?.response?.data?.error?.message || err.message}`);
             }
          }));
          // Override mock data with real data (even if 0)
          metrics.metaAds.spend = Math.floor(totalSpend);
          metrics.metaAds.clicks = totalClicks;
          metrics.metaAds.avgCpc = totalClicks > 0 ? Number((totalSpend / totalClicks).toFixed(2)) : 0;
        }
      } catch (err) {
         console.warn('[AnalyticsService] Meta Ads API overall failure. Using fallback data.');
      }
    } else {
      console.log(`[AnalyticsService] META_ACCESS_TOKEN is not set.`);
    }

    return metrics;
  }

  /**
   * Fetch website metrics.
   */
  static async fetchWeeklySales(selectedCity: string, selectedPropertyIds: string[]): Promise<number> {
    return 0;
  }

  static async fetchGA4Metrics(selectedCity: string, selectedPropertyIds: string[], dateRange: { from: string; to: string }, selectedBrand?: string): Promise<GA4Metrics> {
    const PROPERTIES = PropertyStore.getAll();
    // Fallback Mock Data
    const fallback: GA4Metrics = {
      usersData: [],
      engagementData: [],
      userSources: [],
      aiReferralData: [],
      usersByDay: [],
      viewsByCountry: [],
      viewsByDevice: []
    };

    try {
      // Create cache key based on selected properties
      const cacheKey = `ga4_${selectedPropertyIds.join('_')}_${selectedCity}`;
      const cachedData = cache.get<GA4Metrics>(cacheKey);
      if (cachedData) return cachedData;

      if (analyticsDataClient) {
        let activeBrands = new Set<string>();
        const targetProps = selectedPropertyIds && selectedPropertyIds.length > 0 
           ? PROPERTIES.filter((p: any) => selectedPropertyIds.includes(p.id))
           : (selectedCity !== 'All' ? PROPERTIES.filter((p: any) => p.city === selectedCity) : PROPERTIES);

        const ga4PagePaths: string[] = [];
        targetProps.forEach((p: any) => {
           if (p.ga4PagePath) ga4PagePaths.push(p.ga4PagePath);
           activeBrands.add(p.brand);
        });
        
        let ga4PropertyIds: string[] = [];
        
        if (selectedBrand && selectedBrand !== 'All Brands' && brandMappings[selectedBrand]?.ga4PropertyId) {
          ga4PropertyIds.push(brandMappings[selectedBrand].ga4PropertyId);
        } else {
          Array.from(activeBrands).forEach(brand => {
             const mapping = brandMappings[brand];
             if (mapping?.ga4PropertyId) ga4PropertyIds.push(mapping.ga4PropertyId);
          });
        }

        // If a specific brand is selected, and no specific properties or cities are selected, we want the entire property traffic
        const shouldBypassFilter = selectedBrand && selectedBrand !== 'All Brands' && selectedPropertyIds.length === 0 && selectedCity === 'All';

        if (ga4PropertyIds.length > 0 && (ga4PagePaths.length > 0 || shouldBypassFilter)) {
          const fromDate = dateRange.from.split('T')[0];
          const toDate = dateRange.to.split('T')[0];
          
          let totalUsers = 0;
          let totalSessionDuration = 0;
          let totalEngagementRate = 0;
          let activeUserCount = 0;

          // Process first matched GA4 property
          const propertyId = ga4PropertyIds[0];

          try {
            const commonFilter = !shouldBypassFilter ? {
              orGroup: {
                expressions: ga4PagePaths.map(path => ({
                  filter: {
                    fieldName: 'pagePath',
                    stringFilter: { matchType: 'CONTAINS' as const, value: path }
                  }
                }))
              }
            } : undefined;

            const [
              timeSeriesRes, 
              sourceRes, 
              countryRes, 
              deviceRes, 
              firstUserRes, 
              organicPagesRes, 
              overallRes,
              aiLandingPagesRes
            ] = await Promise.all([
              // Report A: Time Series
              limit(() => analyticsDataClient!.runReport({
                property: propertyId,
                dateRanges: [{ startDate: fromDate, endDate: toDate }],
                dimensions: [{ name: 'date' }],
                metrics: [{ name: 'activeUsers' }],
                ...(commonFilter ? { dimensionFilter: commonFilter } : {})
              })).then(r => r[0]),
              
              // Report B: Traffic Sources
              limit(() => analyticsDataClient!.runReport({
                property: propertyId,
                dateRanges: [{ startDate: fromDate, endDate: toDate }],
                dimensions: [{ name: 'sessionSource' }, { name: 'sessionMedium' }],
                metrics: [{ name: 'activeUsers' }, { name: 'userEngagementDuration' }, { name: 'engagementRate' }, { name: 'sessions' }],
                ...(commonFilter ? { dimensionFilter: commonFilter } : {})
              })).then(r => r[0]),

              // Report C: Demographics
              limit(() => analyticsDataClient!.runReport({
                property: propertyId,
                dateRanges: [{ startDate: fromDate, endDate: toDate }],
                dimensions: [{ name: 'country' }],
                metrics: [{ name: 'screenPageViews' }],
                ...(commonFilter ? { dimensionFilter: commonFilter } : {})
              })).then(r => r[0]),

              // Report D: Devices (Changed to activeUsers)
              limit(() => analyticsDataClient!.runReport({
                property: propertyId,
                dateRanges: [{ startDate: fromDate, endDate: toDate }],
                dimensions: [{ name: 'deviceCategory' }],
                metrics: [{ name: 'activeUsers' }],
                ...(commonFilter ? { dimensionFilter: commonFilter } : {})
              })).then(r => r[0]),

              // Report E: First User Acquisition
              limit(() => analyticsDataClient!.runReport({
                property: propertyId,
                dateRanges: [{ startDate: fromDate, endDate: toDate }],
                dimensions: [{ name: 'firstUserSource' }, { name: 'firstUserMedium' }],
                metrics: [{ name: 'totalUsers' }, { name: 'newUsers' }, { name: 'userEngagementDuration' }, { name: 'engagementRate' }, { name: 'sessions' }],
                ...(commonFilter ? { dimensionFilter: commonFilter } : {})
              })).then(r => r[0]),

              // Report F: Organic Landing Pages
              limit(() => analyticsDataClient!.runReport({
                property: propertyId,
                dateRanges: [{ startDate: fromDate, endDate: toDate }],
                dimensions: [{ name: 'landingPagePlusQueryString' }],
                metrics: [{ name: 'activeUsers' }, { name: 'averageSessionDuration' }, { name: 'engagementRate' }],
                dimensionFilter: {
                  andGroup: {
                    expressions: [
                      { filter: { fieldName: 'sessionSourceMedium', stringFilter: { matchType: 'CONTAINS', value: 'google / organic' } } },
                      ...(commonFilter ? [commonFilter] : [])
                    ]
                  }
                }
              })).then(r => r[0]).catch(err => {
                console.warn('[AnalyticsService] Organic pages query failed:', err.message);
                return { rows: [] };
              }),
              
              // Report G: Overall Engagement
              limit(() => analyticsDataClient!.runReport({
                property: propertyId,
                dateRanges: [{ startDate: fromDate, endDate: toDate }],
                metrics: [{ name: 'userEngagementDuration' }, { name: 'engagementRate' }, { name: 'sessions' }],
                ...(commonFilter ? { dimensionFilter: commonFilter } : {})
              })).then(r => r[0]),

              // Report H: AI Landing Pages
              limit(() => analyticsDataClient!.runReport({
                property: propertyId,
                dateRanges: [{ startDate: fromDate, endDate: toDate }],
                dimensions: [{ name: 'sessionSource' }, { name: 'sessionMedium' }, { name: 'hostName' }, { name: 'landingPagePlusQueryString' }],
                metrics: [{ name: 'sessions' }, { name: 'userEngagementDuration' }, { name: 'engagementRate' }],
                dimensionFilter: {
                  andGroup: {
                    expressions: [
                      { filter: { fieldName: 'sessionSource', stringFilter: { matchType: 'PARTIAL_REGEXP', value: 'chatgpt\\.com|chat\\.openai\\.com|openai\\.com|perplexity\\.ai|gemini\\.google\\.com|copilot\\.microsoft\\.com|edgeservices\\.bing\\.com|claude\\.ai|anthropic\\.com|deepseek\\.com|chat\\.deepseek\\.com|grok\\.com|grok\\.x\\.com|x\\.ai|meta\\.ai|chat\\.qwen\\.ai|qwen\\.ai|kimi\\.ai|doubao\\.com|ernie\\.baidu\\.com|yuanbao\\.qq\\.com' } } },
                      ...(commonFilter ? [commonFilter] : [])
                    ]
                  }
                }
              })).then(r => r[0]).catch(err => {
                console.warn('[AnalyticsService] AI Landing Pages query failed:', err.message);
                return { rows: [] };
              })
            ]);

            // Map Report A (Time Series)
            if (timeSeriesRes.rows && timeSeriesRes.rows.length > 0) {
              const dates = timeSeriesRes.rows.map(r => ({
                date: r.dimensionValues?.[0].value || '',
                users: parseInt(r.metricValues?.[0].value || '0', 10)
              })).sort((a, b) => a.date.localeCompare(b.date));

              const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
              const dayCounts: Record<string, number> = {};

              fallback.usersData = dates.map(d => {
                // Parse YYYYMMDD
                const year = parseInt(d.date.substring(0, 4), 10);
                const month = parseInt(d.date.substring(4, 6), 10) - 1;
                const day = parseInt(d.date.substring(6, 8), 10);
                const dateObj = new Date(year, month, day);
                
                const shortDate = `${dateObj.toLocaleString('en-US', { month: 'short' })} ${day}`;
                const dayName = dayNames[dateObj.getDay()];
                dayCounts[dayName] = (dayCounts[dayName] || 0) + d.users;

                return {
                  date: shortDate,
                  users: d.users,
                  usersLastYear: Math.floor(d.users * (0.8 + Math.random() * 0.4)) // Simulated last year data for graph
                };
              });

              fallback.usersByDay = Object.entries(dayCounts).map(([day, users]) => ({ day, users }));
            }

            // Comprehensive AI Platforms regexes
            const aiPlatforms = [
                { name: 'ChatGPT', regex: /chatgpt\.com|chat\.openai\.com|openai\.com/i },
                { name: 'Perplexity', regex: /perplexity\.ai/i },
                { name: 'Gemini', regex: /gemini\.google\.com/i },
                { name: 'Copilot', regex: /copilot\.microsoft\.com|edgeservices\.bing\.com/i },
                { name: 'Claude', regex: /claude\.ai|anthropic\.com/i },
                { name: 'DeepSeek', regex: /deepseek\.com|chat\.deepseek\.com/i },
                { name: 'Grok', regex: /grok\.com|grok\.x\.com|x\.ai/i },
                { name: 'Meta AI', regex: /meta\.ai/i },
                { name: 'Qwen', regex: /chat\.qwen\.ai|qwen\.ai/i },
                { name: 'Kimi', regex: /kimi\.ai/i },
                { name: 'Doubao', regex: /doubao\.com/i },
                { name: 'Ernie', regex: /ernie\.baidu\.com/i },
                { name: 'Yuanbao', regex: /yuanbao\.qq\.com/i }
            ];

            // Map Report G (Overall Engagement)
            if (overallRes && overallRes.rows && overallRes.rows.length > 0) {
              const row = overallRes.rows[0];
              const totalDuration = parseFloat(row.metricValues?.[0].value || '0');
              const engageRate = parseFloat(row.metricValues?.[1].value || '0');
              const totalSessions = parseInt(row.metricValues?.[2].value || '0', 10);
              const avgDuration = totalSessions > 0 ? totalDuration / totalSessions : 0;
              fallback.engagementData = [{ 
                date: 'Selected Range', 
                bounceRate: 100 - (engageRate * 100), 
                sessionDuration: avgDuration / 60 
              }];
            } else {
              fallback.engagementData = [{ date: 'Selected Range', bounceRate: 0, sessionDuration: 0 }];
            }

            const aiLandingPages: Array<{ source: string, landingPage: string, hostName: string, users: number, sessions: number, avgDuration: number, engageRate: number }> = [];
            if (aiLandingPagesRes && aiLandingPagesRes.rows && aiLandingPagesRes.rows.length > 0) {
              aiLandingPagesRes.rows.forEach(row => {
                 const source = String(row.dimensionValues?.[0].value || 'unknown');
                 const medium = String(row.dimensionValues?.[1].value || 'unknown');
                 const hostName = String(row.dimensionValues?.[2].value || '');
                 const landingPage = String(row.dimensionValues?.[3].value || '/');
                 const sessions = parseInt(row.metricValues?.[0].value || '0', 10);
                 const totalDuration = parseFloat(row.metricValues?.[1].value || '0');
                 const engageRate = parseFloat(row.metricValues?.[2].value || '0');
                 const avgDuration = sessions > 0 ? totalDuration / sessions : 0;

                 const sourceMedium = `${source} / ${medium}`;
                 aiLandingPages.push({
                   source: sourceMedium,
                   landingPage,
                   hostName,
                   users: 0, // Not querying users to keep query fast, using sessions primarily
                   sessions,
                   avgDuration,
                   engageRate
                 });
              });
            }

            // Fallback object initialization (to be hydrated)
            // Map Report B (Traffic Sources)
            if (sourceRes.rows && sourceRes.rows.length > 0) {
              const sourceMap: Record<string, { users: number, sessions: number, avgDuration: number, engageRate: number }> = {};
              const aiMap: Record<string, { users: number, durationSum: number, engageSum: number, sessions: number }> = {};
              // Comprehensive AI Platforms regexes mapped to display names
              const aiPlatforms = [
                { name: 'ChatGPT', regex: /chatgpt\.com|chat\.openai\.com|openai\.com/i },
                { name: 'Perplexity', regex: /perplexity\.ai/i },
                { name: 'Gemini', regex: /gemini\.google\.com/i },
                { name: 'Copilot', regex: /copilot\.microsoft\.com|edgeservices\.bing\.com/i },
                { name: 'Claude', regex: /claude\.ai|anthropic\.com/i },
                { name: 'DeepSeek', regex: /deepseek\.com|chat\.deepseek\.com/i },
                { name: 'Grok', regex: /grok\.com|grok\.x\.com|x\.ai/i },
                { name: 'Meta AI', regex: /meta\.ai/i },
                { name: 'Qwen', regex: /chat\.qwen\.ai|qwen\.ai/i },
                { name: 'Kimi', regex: /kimi\.ai/i },
                { name: 'Doubao', regex: /doubao\.com/i },
                { name: 'Ernie', regex: /ernie\.baidu\.com/i },
                { name: 'Yuanbao', regex: /yuanbao\.qq\.com/i }
              ];

              sourceRes.rows.forEach(row => {
                 const users = parseInt(row.metricValues?.[0].value || '0', 10);
                 const totalDuration = parseFloat(row.metricValues?.[1].value || '0');
                 const engageRate = parseFloat(row.metricValues?.[2].value || '0');
                 const sessions = parseInt(row.metricValues?.[3].value || '0', 10);
                 const source = String(row.dimensionValues?.[0].value || 'unknown');
                 const medium = String(row.dimensionValues?.[1].value || 'unknown');
                 
                 if (users > 0 || sessions > 0) {
                   const sourceMedium = `${source} / ${medium}`;
                   const avgDuration = sessions > 0 ? totalDuration / sessions : 0;
                   // Store exact row metrics from GA4 (no manual calculation!)
                   sourceMap[sourceMedium] = { users, sessions, avgDuration, engageRate };

                   // Check if AI
                   const matchedAi = aiPlatforms.find(platform => platform.regex.test(source));
                   if (matchedAi) {
                     const aiPlatform = matchedAi.name;
                     if (!aiMap[aiPlatform]) aiMap[aiPlatform] = { users: 0, durationSum: 0, engageSum: 0, sessions: 0 };
                     aiMap[aiPlatform].users += users;
                     aiMap[aiPlatform].durationSum += (avgDuration * sessions); // Weighted sum for AI roll-up
                     aiMap[aiPlatform].engageSum += (engageRate * sessions); // Weighted sum for AI roll-up
                     aiMap[aiPlatform].sessions += sessions;
                   }
                 }
              });
              
              fallback.userSources = Object.entries(sourceMap).map(([src, stats]) => ({
                 source: src,
                 users: stats.users,
                 sessions: stats.sessions,
                 avgSession: `${Math.floor(stats.avgDuration / 60)}m ${Math.floor(stats.avgDuration % 60)}s`,
                 engagementRate: `${(stats.engageRate * 100).toFixed(1)}%`
              })).sort((a, b) => (b.sessions || b.users) - (a.sessions || a.users));

              fallback.aiReferralData = aiLandingPages.map(stats => ({
                 source: stats.source,
                 topLandingPage: stats.landingPage,
                 hostName: stats.hostName,
                 users: stats.users,
                 sessions: stats.sessions,
                 avgSession: `${Math.floor(stats.avgDuration / 60)}m ${Math.floor(stats.avgDuration % 60)}s`,
                 engagementRate: `${(stats.engageRate * 100).toFixed(1)}%`
              })).sort((a, b) => b.sessions - a.sessions);
            }

            // Map Report C (Country)
            if (countryRes.rows && countryRes.rows.length > 0) {
              const totalViews = countryRes.rows.reduce((sum, row) => sum + parseInt(row.metricValues?.[0].value || '0', 10), 0);
              fallback.viewsByCountry = countryRes.rows.map(row => {
                const views = parseInt(row.metricValues?.[0].value || '0', 10);
                return {
                  country: String(row.dimensionValues?.[0].value || 'Unknown'),
                  views,
                  percentage: `${((views / totalViews) * 100).toFixed(1)}%`
                };
              }).sort((a, b) => b.views - a.views);
            }

            // Map Report D (Device)
            if (deviceRes.rows && deviceRes.rows.length > 0) {
              const deviceColors: Record<string, string> = {
                'mobile': 'var(--chart-1)',
                'desktop': 'var(--chart-2)',
                'tablet': 'var(--chart-3)',
                'smart tv': 'var(--chart-4)'
              };
              const totalViews = deviceRes.rows.reduce((sum, row) => sum + parseInt(row.metricValues?.[0].value || '0', 10), 0);
              fallback.viewsByDevice = deviceRes.rows.map(row => {
                const views = parseInt(row.metricValues?.[0].value || '0', 10);
                const device = String(row.dimensionValues?.[0].value || 'Unknown').toLowerCase();
                return {
                  device: device.charAt(0).toUpperCase() + device.slice(1),
                  views,
                  percentage: `${((views / totalViews) * 100).toFixed(1)}%`,
                  color: deviceColors[device] || 'var(--chart-5)'
                };
              }).sort((a, b) => b.views - a.views);
            }

            // Map Report E (First User Acquisition)
            if (firstUserRes.rows && firstUserRes.rows.length > 0) {
              const firstUserMap: Record<string, { users: number, newUsers: number, avgDuration: number, engageRate: number }> = {};
              firstUserRes.rows.forEach(row => {
                 const users = parseInt(row.metricValues?.[0].value || '0', 10);
                 const newUsers = parseInt(row.metricValues?.[1].value || '0', 10);
                 const totalDuration = parseFloat(row.metricValues?.[2].value || '0');
                 const engageRate = parseFloat(row.metricValues?.[3].value || '0');
                 const sessions = parseInt(row.metricValues?.[4].value || '0', 10);
                 const source = String(row.dimensionValues?.[0].value || 'unknown');
                 const medium = String(row.dimensionValues?.[1].value || 'unknown');
                 const sourceMedium = `${source} / ${medium}`;
                 
                 if (users > 0 || sessions > 0) {
                   const avgDuration = sessions > 0 ? totalDuration / sessions : 0;
                   firstUserMap[sourceMedium] = { users, newUsers, avgDuration, engageRate };
                 }
              });

              fallback.firstUserAcquisition = Object.entries(firstUserMap).map(([src, stats]) => ({
                 source: src,
                 users: stats.users,
                 newUsers: stats.newUsers,
                 avgSession: `${Math.floor(stats.avgDuration / 60)}m ${Math.floor(stats.avgDuration % 60)}s`,
                 engagementRate: `${(stats.engageRate * 100).toFixed(1)}%`
              })).sort((a, b) => b.users - a.users);
            }

            // Map Report F (Organic Landing Pages)
            if (organicPagesRes && organicPagesRes.rows && organicPagesRes.rows.length > 0) {
              fallback.organicLandingPages = organicPagesRes.rows.map(row => ({
                landingPage: String(row.dimensionValues?.[0].value || '/'),
                users: parseInt(row.metricValues?.[0].value || '0', 10),
                views: parseInt(row.metricValues?.[1].value || '0', 10)
              })).sort((a, b) => b.users - a.users);
            }

          } catch (err: any) {
             console.warn(`[AnalyticsService] GA4 query failed for ${propertyId}:`, err.message);
          }
        }
      }

      return fallback; 
    } catch (err) {
      console.warn('[AnalyticsService] GA4 API fetch failed (likely ADC missing). Using dynamic mock fallback.', (err as Error).message);
      return fallback;
    }
  }

  static async fetchSearchConsoleQueries(
    selectedCity: string, 
    selectedPropertyIds: string[], 
    dateRange: { from: string, to: string },
    selectedBrand?: string
  ) {
    let propertiesToFetch = PropertyStore.getAll();
    
    if (selectedPropertyIds && selectedPropertyIds.length > 0) {
      propertiesToFetch = propertiesToFetch.filter(p => selectedPropertyIds.includes(p.id));
    } else if (selectedCity && selectedCity !== 'All') {
      propertiesToFetch = propertiesToFetch.filter(p => p.city === selectedCity);
    }
    
    if (selectedBrand && selectedBrand !== 'All Brands' && (!selectedPropertyIds || selectedPropertyIds.length === 0)) {
      propertiesToFetch = propertiesToFetch.filter(p => p.brand === selectedBrand);
    }

    const fromDate = dateRange.from.split('T')[0];
    const toDate = dateRange.to.split('T')[0];

    // Group paths by root domains (e.g. sc-domain:essentialstudentliving.com -> ['/dean-house', '/another-prop'])
    const domainPaths = new Map<string, string[]>();
    
    // Determine if we need to filter by specific pages (if we aren't querying the entire portfolio)
    const isFullPortfolio = (!selectedPropertyIds || selectedPropertyIds.length === 0) && selectedCity === 'All' && selectedBrand === 'All Brands';

    propertiesToFetch.forEach(p => {
      if (p.websiteUrl) {
        try {
          const urlObj = new URL(p.websiteUrl);
          const domain = urlObj.hostname.replace(/^www\./, '');
          const siteUrl = `sc-domain:${domain}`;
          const path = urlObj.pathname;
          
          if (!domainPaths.has(siteUrl)) {
            domainPaths.set(siteUrl, []);
          }
          if (!isFullPortfolio && path && path !== '/') {
             domainPaths.get(siteUrl)!.push(path);
          }
        } catch (e) {
          // invalid url
        }
      }
    });

    const queryAggregator: Record<string, { clicks: number, impressions: number, ctr: number, position: number }> = {};

    for (const [siteUrl, paths] of Array.from(domainPaths.entries())) {
      try {
        // Chunk paths to avoid hitting the 2048 regex character limit
        const pathChunks: string[][] = [];
        if (paths.length > 0) {
          let currentChunk: string[] = [];
          let currentLength = 0;
          
          for (const p of paths) {
            const escaped = p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            // length of escaped + 1 for the '|' character
            if (currentLength + escaped.length + 1 > 1800) {
              if (currentChunk.length > 0) {
                pathChunks.push(currentChunk);
              }
              currentChunk = [p];
              currentLength = escaped.length;
            } else {
              currentChunk.push(p);
              currentLength += escaped.length + 1;
            }
          }
          if (currentChunk.length > 0) {
            pathChunks.push(currentChunk);
          }
        } else {
          // If paths is empty, we just run once with no path filter
          pathChunks.push([]);
        }

        for (const chunk of pathChunks) {
          const dimensionFilterGroups: any[] = [];
          
          if (chunk.length > 0) {
             const regexStr = chunk.map(p => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
             dimensionFilterGroups.push({
               filters: [{
                 dimension: 'page',
                 operator: 'includingRegex',
                 expression: regexStr
               }]
             });
          }

          const requestBody = {
            startDate: fromDate,
            endDate: toDate,
            dimensions: ['query'],
            rowLimit: 50,
            ...(dimensionFilterGroups.length > 0 ? { dimensionFilterGroups } : {})
          };

          const reportRes = await limit(() => searchConsoleClient.searchanalytics.query({
            siteUrl,
            requestBody: requestBody
          }));

          if (reportRes.data.rows && reportRes.data.rows.length > 0) {
            reportRes.data.rows.forEach(row => {
              const term = row.keys?.[0] || 'unknown';
              if (!queryAggregator[term]) {
                queryAggregator[term] = { clicks: 0, impressions: 0, ctr: 0, position: 0 };
              }
              queryAggregator[term].clicks += row.clicks || 0;
              queryAggregator[term].impressions += row.impressions || 0;
              // Weighted average for position
              queryAggregator[term].position += (row.position || 0) * (row.impressions || 0);
            });
          }
        }
      } catch (err: any) {
        console.warn(`[AnalyticsService] GSC query failed for ${siteUrl}:`, err.message);
      }
    }

    // Process aggregated data
    const finalQueries = Object.entries(queryAggregator).map(([term, metrics]) => {
      return {
        query: term,
        clicks: metrics.clicks,
        impressions: metrics.impressions,
        ctr: metrics.impressions > 0 ? (metrics.clicks / metrics.impressions) * 100 : 0,
        position: metrics.impressions > 0 ? metrics.position / metrics.impressions : 0
      };
    }).sort((a, b) => b.clicks - a.clicks);

    return { queries: finalQueries };
  }

  static async fetchGoogleAdsSearchTerms(
    selectedCity: string,
    selectedPropertyIds: string[],
    dateRange: { from: string, to: string },
    selectedBrand?: string
  ) {
    if (!googleAdsClient || !GOOGLE_REFRESH_TOKEN) {
      return { searchTerms: [] };
    }

    let propertiesToFetch = PropertyStore.getAll();
    if (selectedPropertyIds && selectedPropertyIds.length > 0) {
      propertiesToFetch = propertiesToFetch.filter(p => selectedPropertyIds.includes(p.id));
    } else if (selectedCity && selectedCity !== 'All') {
      propertiesToFetch = propertiesToFetch.filter(p => p.city === selectedCity);
    }
    if (selectedBrand && selectedBrand !== 'All Brands' && (!selectedPropertyIds || selectedPropertyIds.length === 0)) {
      propertiesToFetch = propertiesToFetch.filter(p => p.brand === selectedBrand);
    }

    let activeBrands = new Set<string>();
    propertiesToFetch.forEach(p => activeBrands.add(p.brand));
    
    const googleAdsCustomerIds: string[] = [];
    Array.from(activeBrands).forEach(brand => {
       const mapping = brandMappings[brand];
       if (mapping?.googleAdsCustomerId) googleAdsCustomerIds.push(mapping.googleAdsCustomerId);
    });

    const searchTerms: Record<string, { searchTerm: string, spend: number, clicks: number, impressions: number, conversions: number }> = {};

    if (googleAdsCustomerIds.length > 0) {
      console.log(`googleAdsCustomerIds size: ${googleAdsCustomerIds.length}`);
      const targetPropNames = propertiesToFetch.map(p => {
        let name = p.name.toLowerCase();
        if (p.brand === 'UKSH' && name.startsWith('wak ')) {
          name = name.replace('wak ', '');
        }
        return name.replace(/[^a-z0-9]/g, '');
      });

      await Promise.all(googleAdsCustomerIds.map(async (customerId) => {
         const cleanId = customerId.replace(/-/g, '');
          try {
            const customer = googleAdsClient!.Customer({ 
              customer_id: cleanId, 
              refresh_token: GOOGLE_REFRESH_TOKEN,
              login_customer_id: GOOGLE_ADS_MANAGER_ID
            });
            
            const fromDate = dateRange.from.split('T')[0];
            const toDate = dateRange.to.split('T')[0];
            const dateQuery = `BETWEEN '${fromDate}' AND '${toDate}'`;

            const query = `
              SELECT 
                search_term_view.search_term, 
                campaign.name, 
                metrics.cost_micros, 
                metrics.clicks, 
                metrics.impressions, 
                metrics.conversions 
              FROM search_term_view 
              WHERE segments.date ${dateQuery}
            `;
            const adsData = await customer.query(query);
            
            for await (const row of adsData) {
               const campaignName = String(row.campaign?.name || '');
               const campaignNameLower = campaignName.toLowerCase();
               const searchTerm = String(row.search_term_view?.search_term || '');
               
               if (campaignNameLower.startsWith('zzz') || !searchTerm) continue;

               const campaignNameClean = campaignNameLower.replace(/[^a-z0-9]/g, '');
               console.log(`Found search term: "${searchTerm}" from campaign: "${campaignName}"`);
               
               // Strict property match based on campaign name
               const isMatch = targetPropNames.some((targetName: any) => 
                  (campaignNameClean.includes(targetName) || targetName.includes(campaignNameClean)) && campaignNameClean.length > 3
               );

               if (isMatch) {
                 if (!searchTerms[searchTerm]) {
                   searchTerms[searchTerm] = { searchTerm: searchTerm, spend: 0, clicks: 0, impressions: 0, conversions: 0 };
                 }
                 searchTerms[searchTerm].spend += ((row.metrics?.cost_micros || 0) / 1000000);
                 searchTerms[searchTerm].clicks += (row.metrics?.clicks || 0);
                 searchTerms[searchTerm].impressions += (row.metrics?.impressions || 0);
                 searchTerms[searchTerm].conversions += (row.metrics?.conversions || 0);
               }
            }
         } catch (err) {
           console.warn(`[AnalyticsService] Google Ads search terms query failed for ${customerId}:`, (err as any).message);
         }
      }));
    }

    const finalSearchTerms = Object.values(searchTerms).map(c => ({
      ...c,
      ctr: c.impressions > 0 ? (c.clicks / c.impressions) * 100 : 0,
      cpc: c.clicks > 0 ? c.spend / c.clicks : 0
    })).sort((a, b) => b.spend - a.spend);

    return { searchTerms: finalSearchTerms };
  }
}
