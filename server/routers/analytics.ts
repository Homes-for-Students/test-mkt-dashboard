import { z } from 'zod';
import { publicProcedure, router } from '../_core/trpc';
import { AnalyticsService } from '../services/analyticsService';
import { AnalyticsService } from '../services/analyticsService';
import crypto from 'crypto';
import NodeCache from 'node-cache';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize in-memory cache
const memoryCache = new NodeCache({ stdTTL: 10800 }); // 3 hours default

// Helper to generate a unique cache key based on inputs
function generateCacheKey(endpoint: string, city: string, propertyIds: string[], dateRange?: { from: string, to: string }): string {
  const hashObj = { endpoint, city, propertyIds: [...propertyIds].sort(), dateRange };
  return crypto.createHash('md5').update(JSON.stringify(hashObj)).digest('hex');
}

// Read from memory cache if available
async function getCache(cacheKey: string): Promise<any | null> {
  try {
    const data = memoryCache.get(cacheKey);
    return data || null;
  } catch (err) {
    console.warn(`[Cache] Failed to query cache for key ${cacheKey}:`, err);
  }
  return null;
}

// Write to memory cache
async function setCache(cacheKey: string, data: any, durationHours = 3): Promise<void> {
  try {
    memoryCache.set(cacheKey, data, durationHours * 60 * 60);
  } catch (err) {
    console.warn(`[Cache] Failed to write cache for key ${cacheKey}:`, err);
  }
}

export const analyticsRouter = router({
  clearCache: publicProcedure
    .mutation(() => {
      memoryCache.flushAll();
      console.log(`[analyticsRouter] Cache fully cleared by user request.`);
      return { success: true };
    }),

  /**
   * Fetches Executive Performance Metrics and Channel Breakdown statistics.
   * Connects to Google Sheets (for Sales & Occupancy) and advertising platform APIs.
   */
  getChannelBreakdown: publicProcedure
    .input(z.object({
      selectedCity: z.string(),
      selectedPropertyIds: z.array(z.string()).default([]),
      selectedBrand: z.string().optional(),
      dateRange: z.object({
        from: z.string(),
        to: z.string(),
      }),
    }))
    .query(async ({ input }) => {
      const cacheKey = generateCacheKey('getChannelBreakdown', input.selectedCity, input.selectedPropertyIds, input.dateRange) + `_${input.selectedBrand || 'all'}`;
      
      // Try to load from database cache
      const cachedData = await getCache(cacheKey);
      if (cachedData) {
        console.log(`[analyticsRouter] Serving cached getChannelBreakdown for key ${cacheKey}`);
        return cachedData;
      }

      // Fetch live data (with grace fallback to mock inside the services)
      console.log(`[analyticsRouter] Cache miss for getChannelBreakdown. Fetching live API data.`);
      const [executiveStats, channelPerformance] = await Promise.all([
        AnalyticsService.fetchGoogleSheetsMetrics(input.selectedCity, input.selectedPropertyIds, input.selectedBrand),
        AnalyticsService.fetchChannelPerformance(input.selectedCity, input.selectedPropertyIds, input.dateRange, input.selectedBrand),
      ]);

      const result = {
        executiveStats,
        channelPerformance,
      };

      // Save to cache
      await setCache(cacheKey, result);

      console.log(`[analyticsRouter] Returning SC totalReviews: ${channelPerformance.studentCrowd.totalReviews} for properties:`, input.selectedPropertyIds);

      return result;
    }),

  /**
   * Fetches GA4 website performance statistics, user trends, referrers, and demographics.
   */
  getWebsitePerformance: publicProcedure
    .input(z.object({
      selectedCity: z.string(),
      selectedPropertyIds: z.array(z.string()).default([]),
      selectedBrand: z.string().optional(),
      dateRange: z.object({
        from: z.string(),
        to: z.string(),
      }),
    }))
    .query(async ({ input }) => {
      const cacheKey = generateCacheKey('getWebsitePerformance_v2', input.selectedCity, input.selectedPropertyIds, input.dateRange) + `_${input.selectedBrand || 'all'}`;
      
      // Try to load from database cache
      const cachedData = await getCache(cacheKey);
      if (cachedData) {
        console.log(`[analyticsRouter] Serving cached getWebsitePerformance for key ${cacheKey}`);
        return cachedData;
      }

      // Fetch live data (with grace fallback to mock inside the services)
      console.log(`[analyticsRouter] Cache miss for getWebsitePerformance. Fetching live API data.`);
      const ga4Metrics = await AnalyticsService.fetchGA4Metrics(input.selectedCity, input.selectedPropertyIds, input.dateRange, input.selectedBrand);

      // Save to cache
      await setCache(cacheKey, ga4Metrics);

      return ga4Metrics;
    }),

  /**
   * Fetches Google Search Console organic search queries.
   */
  getSearchConsoleQueries: publicProcedure
    .input(z.object({
      selectedCity: z.string(),
      selectedPropertyIds: z.array(z.string()).default([]),
      selectedBrand: z.string().optional(),
      dateRange: z.object({
        from: z.string(),
        to: z.string(),
      }),
    }))
    .query(async ({ input }) => {
      const cacheKey = generateCacheKey('getSearchConsoleQueries', input.selectedCity, input.selectedPropertyIds, input.dateRange) + `_${input.selectedBrand || 'all'}`;
      
      const cachedData = await getCache(cacheKey);
      if (cachedData) {
        console.log(`[analyticsRouter] Serving cached getSearchConsoleQueries for key ${cacheKey}`);
        return cachedData;
      }

      console.log(`[analyticsRouter] Cache miss for getSearchConsoleQueries. Fetching live API data.`);
      const queries = await AnalyticsService.fetchSearchConsoleQueries(input.selectedCity, input.selectedPropertyIds, input.dateRange, input.selectedBrand);

      await setCache(cacheKey, queries);
      return queries;
    }),

  getGoogleAdsSearchTerms: publicProcedure
    .input(z.object({
      selectedCity: z.string(),
      selectedPropertyIds: z.array(z.string()).default([]),
      selectedBrand: z.string().optional(),
      dateRange: z.object({
        from: z.string(),
        to: z.string(),
      }),
    }))
    .query(async ({ input }) => {
      const cacheKey = generateCacheKey('getGoogleAdsSearchTerms', input.selectedCity, input.selectedPropertyIds, input.dateRange) + `_${input.selectedBrand || 'all'}`;
      
      const cachedData = await getCache(cacheKey);
      if (cachedData) {
        return cachedData;
      }

      const data = await AnalyticsService.fetchGoogleAdsSearchTerms(input.selectedCity, input.selectedPropertyIds, input.dateRange, input.selectedBrand);
      await setCache(cacheKey, data);
      return data;
    }),

  /**
   * Check if Google Business Profile OAuth token exists
   */
  getGoogleConnectionStatus: publicProcedure
    .query(async () => {
      const tokenPath = path.join(__dirname, '../config/googleToken.json');
      return fs.existsSync(tokenPath);
    }),
});
// Trigger restart
