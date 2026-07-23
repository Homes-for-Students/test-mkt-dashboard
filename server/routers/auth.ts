import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getUserByEmail } from "../db";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import cookie from "cookie";

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
        { id: user.id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: "7d" }
      );

      // Set HTTP-Only Cookie
      ctx.res?.setHeader(
        "Set-Cookie",
        (cookie as any).serialize("auth_token", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/",
          maxAge: 60 * 60 * 24 * 7, // 7 days
        })
      );

      return {
        success: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      };
    }),
  
  debugUsers: publicProcedure.query(async () => {
    // This is temporary to diagnose the login failure
    const db = await import("../db").then(m => m.getDb());
    if (!db) {
      return { connected: false, message: "Database is not connected. Falling back to mock." };
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
