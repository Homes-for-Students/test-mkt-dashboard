import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, shareableTokens, ShareableToken, InsertShareableToken, filterPresets, FilterPreset, InsertFilterPreset } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
      // Test the connection immediately. If it fails, fallback to in-memory mocks.
      await _db.execute(sql`SELECT 1`);
    } catch (error) {
      console.warn("[Database] Failed to connect to MySQL (is it running?), falling back to mock storage.");
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    // Mock user for local testing when DB is down
    return {
      id: 1,
      openId,
      name: "Local Dev User",
      email: "dev@example.com",
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date()
    };
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ============ In-Memory Fallbacks for Local Dev ============
const MOCK_TOKENS: ShareableToken[] = [];
let mockTokenIdCounter = 1;

const MOCK_PRESETS: FilterPreset[] = [];
let mockPresetIdCounter = 1;

// ============ Shareable Token Functions ============

/**
 * Create a new shareable token for dashboard sharing.
 * Generates a secure random token and stores filter configuration.
 */
export async function createShareableToken(data: InsertShareableToken): Promise<ShareableToken | null> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Using in-memory mock for shareable token (DB not available)");
    const mockToken: ShareableToken = {
      id: mockTokenIdCounter++,
      token: data.token,
      createdByUserId: data.createdByUserId,
      selectedPropertyIds: data.selectedPropertyIds || null,
      selectedCity: data.selectedCity || "All",
      dashboardView: data.dashboardView || "overview",
      dateFrom: data.dateFrom || null,
      dateTo: data.dateTo || null,
      displayName: data.displayName || null,
      expiresAt: data.expiresAt || null,
      allowedDomains: data.allowedDomains || null,
      accessCount: 0,
      isPaused: data.isPaused || 0,
      lastAccessedAt: null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    MOCK_TOKENS.push(mockToken);
    return mockToken;
  }

  try {
    const result = await db.insert(shareableTokens).values(data);
    const tokenId = result[0]?.insertId;
    if (!tokenId) return null;

    const token = await db.select().from(shareableTokens).where(eq(shareableTokens.id, tokenId as number)).limit(1);
    return token.length > 0 ? token[0] : null;
  } catch (error) {
    console.error("[Database] Failed to create shareable token:", error);
    throw error;
  }
}

/**
 * Retrieve a shareable token by its token string.
 * Updates access count and last accessed timestamp.
 */
export async function getShareableTokenByToken(token: string, trackView: boolean = true): Promise<ShareableToken | null> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Using in-memory mock for getShareableTokenByToken");
    const found = MOCK_TOKENS.find(t => t.token === token);
    if (!found) return null;
    
    if (found.expiresAt && new Date(found.expiresAt) < new Date()) {
      return null;
    }
    
    if (trackView) {
      found.accessCount += 1;
      found.lastAccessedAt = new Date();
    }
    return found;
  }

  try {
    const result = await db.select().from(shareableTokens).where(eq(shareableTokens.token, token)).limit(1);
    if (result.length === 0) return null;

    const tokenData = result[0];

    // Check if token has expired
    if (tokenData.expiresAt && new Date(tokenData.expiresAt) < new Date()) {
      return null; // Token expired
    }

    // Update access count and last accessed timestamp if tracking
    if (trackView) {
      await db.update(shareableTokens)
        .set({
          accessCount: (tokenData.accessCount || 0) + 1,
          lastAccessedAt: new Date(),
        })
        .where(eq(shareableTokens.token, token));
    }

    return tokenData;
  } catch (error) {
    console.error("[Database] Failed to get shareable token:", error);
    throw error;
  }
}

/**
 * Get all shareable tokens created by a specific user.
 */
export async function getShareableTokensByUserId(userId: number): Promise<ShareableToken[]> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Using in-memory mock for getShareableTokensByUserId");
    return MOCK_TOKENS.filter(t => t.createdByUserId === userId);
  }

  try {
    return await db.select().from(shareableTokens)
      .where(eq(shareableTokens.createdByUserId, userId))
      .orderBy(sql`${shareableTokens.createdAt} DESC`);
  } catch (error) {
    console.error("[Database] Failed to get user's shareable tokens:", error);
    throw error;
  }
}

/**
 * Toggle pause status of a shareable link.
 */
export async function toggleShareableTokenPause(tokenId: number, isPaused: number): Promise<boolean> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Using in-memory mock for toggleShareableTokenPause");
    const token = MOCK_TOKENS.find(t => t.id === tokenId);
    if (token) {
      token.isPaused = isPaused;
      return true;
    }
    return false;
  }

  try {
    await db.update(shareableTokens)
      .set({ isPaused })
      .where(eq(shareableTokens.id, tokenId));
    return true;
  } catch (error) {
    console.error("[Database] Failed to toggle shareable token pause:", error);
    throw error;
  }
}

/**
 * Delete a shareable token by its ID.
 */
export async function deleteShareableToken(tokenId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Using in-memory mock for deleteShareableToken");
    const index = MOCK_TOKENS.findIndex(t => t.id === tokenId);
    if (index !== -1) {
      MOCK_TOKENS.splice(index, 1);
      return true;
    }
    return false;
  }

  try {
    await db.delete(shareableTokens).where(eq(shareableTokens.id, tokenId));
    return true;
  } catch (error) {
    console.error("[Database] Failed to delete shareable token:", error);
    throw error;
  }
}

// ============ Property Filter Preset Functions ============

/**
 * Update the access list for a shareable token.
 */
export async function updateShareableTokenAccess(tokenId: number, allowedDomains: string[] | null): Promise<boolean> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Using in-memory mock for updateShareableTokenAccess");
    const token = MOCK_TOKENS.find(t => t.id === tokenId);
    if (token) {
      token.allowedDomains = allowedDomains;
      return true;
    }
    return false;
  }

  try {
    await db.update(shareableTokens)
      .set({ allowedDomains })
      .where(eq(shareableTokens.id, tokenId));
    return true;
  } catch (error) {
    console.error("[Database] Failed to update shareable token access:", error);
    throw error;
  }
}

/**
 * Create a new property filter preset for a user.
 */
export async function createFilterPreset(data: InsertFilterPreset): Promise<FilterPreset | null> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Using in-memory mock for createFilterPreset");
    const mockPreset: FilterPreset = {
      id: mockPresetIdCounter++,
      userId: data.userId,
      presetName: data.presetName,
      propertyIds: data.propertyIds,
      city: data.city,
      isFavorite: data.isFavorite || 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    MOCK_PRESETS.push(mockPreset);
    return mockPreset;
  }

  try {
    const result = await db.insert(filterPresets).values(data);
    const presetId = result[0]?.insertId;
    if (!presetId) return null;

    const preset = await db.select().from(filterPresets).where(eq(filterPresets.id, presetId as number)).limit(1);
    return preset.length > 0 ? preset[0] : null;
  } catch (error) {
    console.error("[Database] Failed to create property filter preset:", error);
    throw error;
  }
}

/**
 * Get all property filter presets for a specific user.
 */
export async function getFilterPresetsByUserId(userId: number): Promise<FilterPreset[]> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Using in-memory mock for getFilterPresetsByUserId");
    return MOCK_PRESETS.filter(p => p.userId === userId);
  }

  try {
    return await db.select().from(filterPresets).where(eq(filterPresets.userId, userId));
  } catch (error) {
    console.error("[Database] Failed to get property filter presets:", error);
    throw error;
  }
}

/**
 * Update a property filter preset.
 */
export async function updateFilterPreset(presetId: number, data: Partial<InsertFilterPreset>): Promise<FilterPreset | null> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Using in-memory mock for updateFilterPreset");
    const found = MOCK_PRESETS.find(p => p.id === presetId);
    if (!found) return null;
    
    if (data.presetName !== undefined) found.presetName = data.presetName;
    if (data.propertyIds !== undefined) found.propertyIds = data.propertyIds;
    if (data.city !== undefined) found.city = data.city;
    if (data.isFavorite !== undefined) found.isFavorite = data.isFavorite;
    found.updatedAt = new Date();
    return found;
  }

  try {
    await db.update(filterPresets)
      .set(data)
      .where(eq(filterPresets.id, presetId));

    const preset = await db.select().from(filterPresets).where(eq(filterPresets.id, presetId)).limit(1);
    return preset.length > 0 ? preset[0] : null;
  } catch (error) {
    console.error("[Database] Failed to update property filter preset:", error);
    throw error;
  }
}

/**
 * Delete a property filter preset.
 */
export async function deleteFilterPreset(presetId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Using in-memory mock for deleteFilterPreset");
    const index = MOCK_PRESETS.findIndex(p => p.id === presetId);
    if (index !== -1) {
      MOCK_PRESETS.splice(index, 1);
      return true;
    }
    return false;
  }

  try {
    await db.delete(filterPresets).where(eq(filterPresets.id, presetId));
    return true;
  } catch (error) {
    console.error("[Database] Failed to delete property filter preset:", error);
    throw error;
  }
}
