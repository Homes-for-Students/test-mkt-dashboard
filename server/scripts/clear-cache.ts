import { db } from '../db';
import { eq, like } from 'drizzle-orm';
import { apiCache } from '../db/schema';
import * as dotenv from 'dotenv';
dotenv.config();

async function run() {
  const result = await db.delete(apiCache).where(like(apiCache.key, 'getWebsitePerformance%')).returning();
  console.log(`Deleted ${result.length} cache entries for getWebsitePerformance.`);
}

run().catch(console.error);
