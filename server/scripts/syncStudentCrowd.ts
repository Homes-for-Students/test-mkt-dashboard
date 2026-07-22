import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import dotenv from 'dotenv';
import { PropertyStore } from '../services/propertyStore.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

const STATS_PATH = path.join(__dirname, '../config/studentCrowdStats.json');

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function syncStudentCrowdStats() {
  console.log('[StudentCrowd Sync] Starting full synchronization...');
  
  const STUDENT_CROWD_API_KEY = process.env.STUDENT_CROWD_API_KEY;
  if (!STUDENT_CROWD_API_KEY) {
    console.error('[StudentCrowd Sync] Missing STUDENT_CROWD_API_KEY in environment variables.');
    return;
  }

  const properties = PropertyStore.getAll();
  const propertiesWithSC = properties.filter(p => p.studentCrowdId);
  
  console.log(`[StudentCrowd Sync] Found ${propertiesWithSC.length} properties with StudentCrowd IDs.`);

  // Load existing stats to merge
  let stats: Record<string, { totalReviews: number, overallRating: number, lastUpdated: string }> = {};
  if (fs.existsSync(STATS_PATH)) {
    try {
      stats = JSON.parse(fs.readFileSync(STATS_PATH, 'utf8'));
    } catch (e) {
      console.warn('[StudentCrowd Sync] Failed to parse existing stats. Starting fresh.');
    }
  }

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < propertiesWithSC.length; i++) {
    const prop = propertiesWithSC[i];
    const hallId = prop.studentCrowdId!;
    
    console.log(`[StudentCrowd Sync] (${i + 1}/${propertiesWithSC.length}) Fetching ${prop.name}...`);
    
    try {
      // 1. Fetch rating
      const hallRes = await axios.get(`https://data.studentcrowd.net/api/v1.0/halls/${hallId}`, {
        headers: { 'X-Api-Key': STUDENT_CROWD_API_KEY }
      });
      const rating = hallRes.data?.attributes?.rating || 0; // Keeping unrounded full precision

      // 2. Fetch total reviews by looking at the last page of a size=1 request
      let totalReviews = 0;
      const reviewsRes = await axios.get(`https://data.studentcrowd.net/api/v1.0/halls/${hallId}/reviews?size=1`, {
        headers: { 'X-Api-Key': STUDENT_CROWD_API_KEY }
      });
      const lastLink = reviewsRes.data?.links?.last;
      if (lastLink) {
        const pageMatch = lastLink.match(/page=(\d+)/);
        if (pageMatch && pageMatch[1]) {
          totalReviews = parseInt(pageMatch[1], 10);
        }
      } else if (reviewsRes.data?.data && reviewsRes.data.data.length > 0) {
        // Fallback: If there's data but no 'last' link, it's exactly 1 review
        totalReviews = reviewsRes.data.data.length;
      }

      stats[prop.id] = {
        totalReviews,
        overallRating: rating,
        lastUpdated: new Date().toISOString()
      };
      
      // Save progressively so the dashboard can display data immediately as it downloads
      fs.writeFileSync(STATS_PATH, JSON.stringify(stats, null, 2));
      
      successCount++;
    } catch (err: any) {
      failCount++;
      console.error(`[StudentCrowd Sync] Failed for ${prop.name} (${hallId}):`, err.response?.status || err.message);
    }

    // MANDATORY DELAY: 1 second between requests to prevent 429 Rate Limits
    await delay(1000);
  }

  // Save back to file
  fs.writeFileSync(STATS_PATH, JSON.stringify(stats, null, 2));
  console.log(`[StudentCrowd Sync] Completed. Success: ${successCount}, Failed: ${failCount}`);
}

// Removed direct command line execution block as it breaks esbuild bundling.
