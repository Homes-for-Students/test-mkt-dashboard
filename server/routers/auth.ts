import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getUserByEmail } from "../db";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import cookie from "cookie";
import { eq } from "drizzle-orm";

const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret-for-local-dev-only";

export const authRouter = router({
  login: publicProcedure
    .input(z.object({
      email: z.string().email(),
      password: z.string().min(1),
    }))
    .mutation(async ({ input, ctx }) => {
      const user = await getUserByEmail(input.email);

      if (!user || !user.password) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid email or password",
        });
      }

      const isValid = await bcrypt.compare(input.password, user.password);

      if (!isValid) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid email or password",
        });
      }

      // Generate JWT Token
      const token = jwt.sign(
        { id: user.id, email: user.email, name: user.name, role: user.role },
        JWT_SECRET,
        { expiresIn: "7d" }
      );

      // Set HTTP-Only Cookie
      ctx.res?.setHeader(
        "Set-Cookie",
        (cookie as any).serialize("auth_token", token, {
          httpOnly: true,
          secure: true,
          sameSite: "none",
          path: "/",
          maxAge: 60 * 60 * 24 * 7, // 7 days
        })
      );

      return {
        success: true,
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      };
    }),

  requestOtp: publicProcedure
    .input(
      z.object({
        email: z.string().email().trim(),
      })
    )
    .mutation(async ({ input }) => {
      const user = await getUserByEmail(input.email);
      
      if (!user) {
        // Return success anyway to prevent email enumeration
        return { success: true };
      }

      const db = await import("../db").then(m => m.getDb());
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not connected" });
      const { users } = await import("../../drizzle/schema");
      
      // Generate 6 digit code
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
      const hashedOtp = await bcrypt.hash(otpCode, 10);

      await db.update(users)
        .set({ otpCode: hashedOtp, otpExpiresAt: expiresAt })
        .where(eq(users.id, user.id));

      try {
        const mailerUrl = "https://hfs-mailer.marketingenquiries.workers.dev";
        const res = await fetch(mailerUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: user.email, otpCode })
        });
        
        if (!res.ok) {
          console.error("Failed to send email via Cloudflare worker", await res.text());
        }
      } catch (err) {
        console.error("Error calling mailer", err);
      }

      return { success: true };
    }),

  verifyOtp: publicProcedure
    .input(
      z.object({
        email: z.string().email().trim(),
        code: z.string().length(6),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const user = await getUserByEmail(input.email);

      if (!user || !user.otpCode || !user.otpExpiresAt) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid or expired passcode" });
      }

      if (new Date() > user.otpExpiresAt) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Passcode has expired" });
      }

      const isValid = await bcrypt.compare(input.code, user.otpCode);
      if (!isValid) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid passcode" });
      }

      const db = await import("../db").then(m => m.getDb());
      if (db) {
        const { users } = await import("../../drizzle/schema");
        await db.update(users)
          .set({ otpCode: null, otpExpiresAt: null, lastSignedIn: new Date() })
          .where(eq(users.id, user.id));
      }

      const token = jwt.sign(
        { id: user.id, email: user.email, name: user.name, role: user.role },
        JWT_SECRET,
        { expiresIn: "7d" }
      );

      ctx.res?.setHeader(
        "Set-Cookie",
        (cookie as any).serialize("auth_token", token, {
          httpOnly: true,
          secure: true,
          sameSite: "none",
          path: "/",
          maxAge: 60 * 60 * 24 * 7,
        })
      );

      return {
        success: true,
        token,
        user: { id: user.id, name: user.name, email: user.email, role: user.role },
      };
    }),
  
  debugUsers: publicProcedure.query(async () => {
    try {
      const dbUrl = process.env.DATABASE_URL;
      if (!dbUrl) return { connected: false, error: "DATABASE_URL is not set in environment variables." };
      
      const db = await import("../db").then(m => m.getDb());
      if (!db) {
        // We will do a raw test just to capture the exact error message
        const mysql = await import("mysql2/promise");
        try {
          const conn = await mysql.createConnection(dbUrl);
          await conn.end();
          return { connected: false, error: "getDb() returned null but raw test succeeded. Strange." };
        } catch (rawError: any) {
          return { connected: false, error: rawError.message, code: rawError.code, stack: rawError.stack };
        }
      }
      
      const { users } = await import("../../drizzle/schema");
      const allUsers = await db.select().from(users);
      return {
        connected: true,
        users: allUsers.map(u => ({
          id: u.id,
          email: u.email,
          passwordHashLength: u.password?.length,
          passwordHashStart: u.password?.substring(0, 10),
          role: u.role,
        })),
      };
    } catch (e: any) {
      return { connected: false, error: e.message, code: e.code };
    }
  }),

  logout: publicProcedure.mutation(({ ctx }) => {
    ctx.res?.setHeader(
      "Set-Cookie",
      (cookie as any).serialize("auth_token", "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 0, 
      })
    );
    return { success: true };
  }),

  getMe: publicProcedure.query(({ ctx }) => {
    return ctx.user;
  }),
});
