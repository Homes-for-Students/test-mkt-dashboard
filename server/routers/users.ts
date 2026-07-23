import { z } from "zod";
import { superAdminProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { users } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";
import crypto from "crypto";

export const usersRouter = router({
  getAll: superAdminProcedure.query(async () => {
    const db = await getDb();
    if (!db) {
      // Return a mock list if DB is down
      return [
        { id: 1, email: "admin@example.com", name: "Mock Admin", role: "super_admin" },
        { id: 2, email: "viewer@example.com", name: "Mock Viewer", role: "viewer" },
      ];
    }
    const allUsers = await db.select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      lastSignedIn: users.lastSignedIn,
    }).from(users);
    return allUsers;
  }),

  create: superAdminProcedure
    .input(z.object({
      email: z.string().email(),
      name: z.string(),
      password: z.string().min(6),
      role: z.enum(["viewer", "admin", "super_admin"]),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available." });
      }

      // Check if email exists
      const existing = await db.select().from(users).where(eq(users.email, input.email)).limit(1);
      if (existing.length > 0) {
        throw new TRPCError({ code: "CONFLICT", message: "User with this email already exists." });
      }

      const hashedPassword = await bcrypt.hash(input.password, 10);
      
      // We still need an openId since it's required by the schema (originally for SSO)
      // We'll generate a random one for local users.
      const openId = `local-${crypto.randomUUID()}`;

      await db.insert(users).values({
        openId,
        email: input.email,
        name: input.name,
        password: hashedPassword,
        role: input.role,
        loginMethod: "local",
      });

      return { success: true };
    }),

  delete: superAdminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available." });

      if (input.id === ctx.user?.id) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "You cannot delete yourself." });
      }

      await db.delete(users).where(eq(users.id, input.id));
      return { success: true };
    }),
});
