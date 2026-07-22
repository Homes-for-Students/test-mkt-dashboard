import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    // Authentication is optional for public procedures.
    user = null;
  }

  // Auto-login a mock user for local development to test protected endpoints
  if (!user && process.env.NODE_ENV !== "production") {
    user = {
      id: 1,
      name: "Local Dev User",
      email: "dev@example.com",
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
