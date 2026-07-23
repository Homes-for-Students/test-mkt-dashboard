import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

const requireViewer = t.middleware(async opts => {
  const { ctx, next } = opts;
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});

const requireAdmin = t.middleware(async opts => {
  const { ctx, next } = opts;
  if (!ctx.user || (ctx.user.role !== 'admin' && ctx.user.role !== 'super_admin')) {
    throw new TRPCError({ code: "FORBIDDEN", message: "You must be an admin to perform this action." });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});

const requireSuperAdmin = t.middleware(async opts => {
  const { ctx, next } = opts;
  if (!ctx.user || ctx.user.role !== 'super_admin') {
    throw new TRPCError({ code: "FORBIDDEN", message: "You must be a super admin to perform this action." });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});

// Any logged in user (viewer, admin, super_admin)
export const protectedProcedure = t.procedure.use(requireViewer);
export const viewerProcedure = t.procedure.use(requireViewer);

// Admin or Super Admin only
export const adminProcedure = t.procedure.use(requireAdmin);

// Super Admin only
export const superAdminProcedure = t.procedure.use(requireSuperAdmin);
