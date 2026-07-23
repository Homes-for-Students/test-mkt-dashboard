import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { sharingRouter } from "./routers/sharing";
import { analyticsRouter } from "./routers/analytics";
import { propertiesRouter } from "./routers/properties";
import { brandColorsRouter } from "./routers/brandColors";
import { researchRouter } from "./routers/research";
import { authRouter } from "./routers/auth";
import { usersRouter } from "./routers/users";

export const appRouter = router({
  system: systemRouter,
  auth: authRouter,
  users: usersRouter,
  sharing: sharingRouter,
  analytics: analyticsRouter,
  properties: propertiesRouter,
  brandColors: brandColorsRouter,
  research: researchRouter,
});

export type AppRouter = typeof appRouter;
