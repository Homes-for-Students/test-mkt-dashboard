import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, json } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(), // We'll keep this for compatibility, but use email for login
  password: varchar("password", { length: 255 }), // Hash of the user's password
  name: text("name"),
  email: varchar("email", { length: 320 }).unique(),
  loginMethod: varchar("loginMethod", { length: 64 }).default('local'),
  role: mysqlEnum("role", ["viewer", "admin", "super_admin"]).default("viewer").notNull(),
  otpCode: varchar("otpCode", { length: 64 }), // Store bcrypt hash of the 6-digit code for security
  otpExpiresAt: timestamp("otpExpiresAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Shareable dashboard link configurations.
 */
export const shareableTokens = mysqlTable("shareable_tokens", {
  id: int("id").autoincrement().primaryKey(),
  token: varchar("token", { length: 64 }).notNull().unique(),
  createdByUserId: int("createdByUserId").notNull(),
  selectedPropertyIds: json("selectedPropertyIds").$type<string[]>(),
  selectedCity: varchar("selectedCity", { length: 255 }).default("All").notNull(),
  dashboardView: varchar("dashboardView", { length: 255 }).default("overview").notNull(),
  dateFrom: timestamp("dateFrom"),
  dateTo: timestamp("dateTo"),
  displayName: varchar("displayName", { length: 255 }),
  expiresAt: timestamp("expiresAt"),
  accessCount: int("accessCount").default(0).notNull(),
  isPaused: int("isPaused").default(0).notNull(),
  allowedDomains: json("allowedDomains").$type<string[]>(),
  lastAccessedAt: timestamp("lastAccessedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ShareableToken = typeof shareableTokens.$inferSelect;
export type InsertShareableToken = typeof shareableTokens.$inferInsert;

/**
 * Property filter presets saved by users.
 */
export const filterPresets = mysqlTable("filter_presets", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  presetName: varchar("presetName", { length: 255 }).notNull(),
  propertyIds: json("propertyIds").$type<string[]>().notNull(),
  city: varchar("city", { length: 255 }).notNull(),
  isFavorite: int("isFavorite").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type FilterPreset = typeof filterPresets.$inferSelect;
export type InsertFilterPreset = typeof filterPresets.$inferInsert;

/**
 * Cache table for marketing and Google Sheets API responses.
 */
export const marketingApiCaches = mysqlTable("marketing_api_caches", {
  id: int("id").autoincrement().primaryKey(),
  cacheKey: varchar("cacheKey", { length: 255 }).notNull().unique(),
  data: json("data").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type MarketingApiCache = typeof marketingApiCaches.$inferSelect;
export type InsertMarketingApiCache = typeof marketingApiCaches.$inferInsert;

/**
 * Properties managed via the dashboard.
 */
export const properties = mysqlTable("properties", {
  id: varchar("id", { length: 64 }).primaryKey(), // using string ID like 'prop-1' or UUID
  name: varchar("name", { length: 255 }).notNull(),
  brand: varchar("brand", { length: 255 }).notNull(),
  city: varchar("city", { length: 255 }).notNull(),
  beds: int("beds").notNull().default(0),
  occupancyRate: int("occupancyRate").default(0), // Out of 100
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Property = typeof properties.$inferSelect;
export type InsertProperty = typeof properties.$inferInsert;

/**
 * Brand color settings dynamically configured by users.
 */
export const brandColors = mysqlTable("brand_colors", {
  brand: varchar("brand", { length: 255 }).primaryKey(),
  backgroundColor: varchar("backgroundColor", { length: 32 }).notNull(),
  textColor: varchar("textColor", { length: 32 }).notNull().default('#ffffff'),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type BrandColor = typeof brandColors.$inferSelect;
export type InsertBrandColor = typeof brandColors.$inferInsert;
