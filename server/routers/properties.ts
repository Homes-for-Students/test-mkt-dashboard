import { z } from "zod";
import { publicProcedure, adminProcedure, router } from "../_core/trpc";
import { PropertyStore } from "../services/propertyStore";

export const propertiesRouter = router({
  getAll: publicProcedure.query(() => {
    return PropertyStore.getAll();
  }),
  
  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(({ input }) => {
      const property = PropertyStore.getById(input.id);
      if (!property) throw new Error("Property not found");
      return property;
    }),
    
  create: adminProcedure
    .input(z.object({
      name: z.string(),
      brand: z.string(),
      city: z.string(),
      beds: z.number().min(0),
      occupancyRate: z.number().min(0).max(100),
      websiteUrl: z.string().url().optional().or(z.literal('')),
      googleBusinessProfileId: z.string().optional().or(z.literal('')),
      client: z.string().optional(),
    }))
    .mutation(({ input }) => {
      return PropertyStore.add(input);
    }),
    
  update: adminProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().optional(),
      brand: z.string().optional(),
      city: z.string().optional(),
      beds: z.number().min(0).optional(),
      occupancyRate: z.number().min(0).max(100).optional(),
      websiteUrl: z.string().url().optional().or(z.literal('')),
      googleBusinessProfileId: z.string().optional().or(z.literal('')),
      client: z.string().optional(),
    }))
    .mutation(({ input }) => {
      const { id, ...updates } = input;
      const updated = PropertyStore.update(id, updates);
      if (!updated) throw new Error("Property not found");
      return updated;
    }),
    
  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ input }) => {
      const success = PropertyStore.delete(input.id);
      if (!success) throw new Error("Property not found");
      return { success: true };
    }),
});
