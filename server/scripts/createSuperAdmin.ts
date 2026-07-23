import { getDb } from "../db";
import { users } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";
import crypto from "crypto";
import dotenv from "dotenv";

dotenv.config();

async function createSuperAdmin() {
  const email = process.argv[2];
  const password = process.argv[3];

  if (!email || !password) {
    console.error("Usage: npx tsx server/scripts/createSuperAdmin.ts <email> <password>");
    process.exit(1);
  }

  const db = await getDb();
  if (!db) {
    console.error("Database connection failed. Ensure DATABASE_URL is set.");
    process.exit(1);
  }

  try {
    const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (existing.length > 0) {
      console.error(`User with email ${email} already exists.`);
      process.exit(1);
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const openId = `local-${crypto.randomUUID()}`;

    await db.insert(users).values({
      openId,
      email,
      name: "Initial Super Admin",
      password: hashedPassword,
      role: "super_admin",
      loginMethod: "local",
    });

    console.log(`Successfully created Super Admin user: ${email}`);
    process.exit(0);
  } catch (err) {
    console.error("Error creating Super Admin:", err);
    process.exit(1);
  }
}

createSuperAdmin();
