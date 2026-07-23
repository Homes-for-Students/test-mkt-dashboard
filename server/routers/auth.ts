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
        const resendApiKey = process.env.RESEND_API_KEY;
        if (!resendApiKey) {
          console.error("Missing RESEND_API_KEY environment variable");
        } else {
          const fromEmail = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
          const templateId = process.env.RESEND_TEMPLATE_ID;
          
          const payload: Record<string, any> = {
            from: `HFS Dashboard <${fromEmail}>`,
            to: user.email,
            subject: "Your Dashboard Login Code"
          };

          if (templateId) {
            // Use Resend dashboard template if provided
            payload.template = {
              id: templateId,
              variables: {
                otpCode: otpCode
              }
            };
          } else {
            // Local HTML email template fallback
            payload.text = `Your One-Time Passcode is: ${otpCode}\n\nThis code will expire in 10 minutes.\nIf you did not request this, please ignore this email.`;
            payload.html = `
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; padding: 40px 20px; text-align: center;">
                <div style="max-width: 480px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-top: 4px solid #f58524; border-radius: 16px; padding: 40px; text-align: left; box-shadow: 0 4px 12px rgba(0,0,0,0.03);">
                  <div style="text-align: center; margin-bottom: 32px;">
                    <h2 style="color: #0f172a; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">Homes for Students</h2>
                    <p style="color: #f58524; margin: 4px 0 0 0; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Reporting Dashboard</p>
                  </div>
                  
                  <h3 style="color: #0f172a; font-size: 18px; font-weight: 700; margin-bottom: 16px; margin-top: 0;">Verification Code</h3>
                  <p style="color: #475569; font-size: 14px; line-height: 24px; margin-bottom: 24px;">Please use the following 6-digit passcode to sign into your HFS Performance Dashboard. This passcode is valid for the next <strong>10 minutes</strong>.</p>
                  
                  <div style="background-color: #fff7ed; border-radius: 12px; padding: 18px; text-align: center; margin-bottom: 24px; border: 1px dashed #f58524;">
                    <span style="font-family: monospace; font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #f58524; margin-left: 8px;">${otpCode}</span>
                  </div>
                  
                  <p style="color: #94a3b8; font-size: 11px; line-height: 18px; margin-bottom: 0; border-top: 1px solid #f1f5f9; padding-top: 16px;">If you did not request this, you can safely ignore this email. Someone may have entered your email by mistake.</p>
                </div>
                <div style="margin-top: 24px; text-align: center;">
                  <p style="color: #94a3b8; font-size: 11px; margin: 0;">&copy; 2026 Homes for Students. All rights reserved.</p>
                </div>
              </div>
            `;
          }

          const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${resendApiKey}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
          });
          
          if (!res.ok) {
            console.error("Failed to send email via Resend", await res.text());
          }
        }
      } catch (err) {
        console.error("Error calling Resend", err);
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
