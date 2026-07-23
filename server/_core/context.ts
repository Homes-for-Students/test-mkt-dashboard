import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import cookie from "cookie";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret-for-local-dev-only";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: Pick<User, "id" | "email" | "name" | "role"> | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: Pick<User, "id" | "email" | "name" | "role"> | null = null;

  try {
    const cookies = (cookie as any).parse(opts.req.headers.cookie || "");
    const token = cookies.auth_token;

    if (token) {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      if (decoded && decoded.id) {
        user = {
          id: decoded.id,
          email: decoded.email,
          name: decoded.name,
          role: decoded.role,
        };
      }
    }
  } catch (error) {
    // Invalid token
    user = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
