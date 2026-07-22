import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { BrandColorStore } from "../services/brandColorStore";

export const brandColorsRouter = router({
  getAll: publicProcedure.query(() => {
    return BrandColorStore.getAll();
  }),
  
  upsert: publicProcedure
    .input(z.object({
      brand: z.string(),
      fullName: z.string().optional(),
      backgroundColor: z.string(),
      secondaryColor: z.string().optional(),
      textColor: z.string(),
    }))
    .mutation(({ input }) => {
      return BrandColorStore.upsert(input);
    }),
});
