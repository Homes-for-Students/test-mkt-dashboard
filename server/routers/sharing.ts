import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { nanoid } from "nanoid";
import {
  createShareableToken,
  getShareableTokenByToken,
  getShareableTokensByUserId,
  deleteShareableToken,
  createFilterPreset,
  getFilterPresetsByUserId,
  updateFilterPreset,
  deleteFilterPreset,
  updateShareableTokenAccess,
} from "../db";

export const sharingRouter = router({
  /**
   * Create a shareable link for the current dashboard view.
   * Generates a secure token and returns a shareable URL.
   */
  createShareableLink: protectedProcedure
    .input(
      z.object({
        selectedPropertyIds: z.array(z.string()),
        selectedCity: z.string().default("All"),
        dashboardView: z.string().default("overview"),
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
        displayName: z.string().optional(),
        expiresInDays: z.number().optional().default(30), // Default 30 days
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Generate a secure random token
        const token = nanoid(32);

        // Calculate expiration date
        const expiresAt = input.expiresInDays
          ? new Date(Date.now() + input.expiresInDays * 24 * 60 * 60 * 1000)
          : null;

        // Create the shareable token in the database
        const shareableToken = await createShareableToken({
          token,
          createdByUserId: ctx.user.id,
          selectedPropertyIds: input.selectedPropertyIds,
          selectedCity: input.selectedCity,
          dashboardView: input.dashboardView,
          dateFrom: input.dateFrom ? new Date(input.dateFrom) : undefined,
          dateTo: input.dateTo ? new Date(input.dateTo) : undefined,
          displayName: input.displayName,
          expiresAt,
          allowedDomains: ['wearehomesforstudents.com'],
        });

        if (!shareableToken) {
          throw new Error("Failed to create shareable token");
        }

        // Return the shareable URL and token info
        return {
          success: true,
          token: shareableToken.token,
          shareUrl: `/share/${shareableToken.token}`,
          expiresAt: shareableToken.expiresAt,
          displayName: shareableToken.displayName,
        };
      } catch (error) {
        console.error("Error creating shareable link:", error);
        throw error;
      }
    }),

  /**
   * Get a shareable token's configuration by token string.
   * Public endpoint - validates token and returns dashboard config.
   */
  getShareableTokenConfig: publicProcedure
    .input(z.object({ token: z.string(), trackView: z.boolean().optional().default(true) }))
    .query(async ({ ctx, input }) => {
      try {
        const tokenData = await getShareableTokenByToken(input.token, input.trackView);

        if (!tokenData) {
          return {
            success: false,
            error: "Token not found or expired",
          };
        }
        // Domain-based Access Management (Cloudflare)
        // Bypass checks in local development
        if (process.env.NODE_ENV !== "development" && tokenData.allowedDomains && tokenData.allowedDomains.length > 0) {
          const cfEmail = (ctx.req.headers['cf-access-authenticated-user-email'] || ctx.req.headers['x-mock-cf-email']) as string | undefined;
          if (!cfEmail) {
            return {
              success: false,
              error: "Authentication required via Cloudflare Access",
            };
          }
          const userDomain = cfEmail.split('@')[1]?.toLowerCase();
          const isAllowed = tokenData.allowedDomains.some((d: string) => {
            const cleanD = d.toLowerCase();
            if (cleanD.includes('@')) {
              // It's a specific email address
              return cleanD === cfEmail.toLowerCase();
            } else {
              // It's a domain
              return cleanD === userDomain;
            }
          });
          if (!isAllowed) {
            return {
              success: false,
              error: `Access Denied: Domain @${userDomain} is not on the allowed list for this link.`,
            };
          }
        }

        if (tokenData.isPaused) {
          return {
            success: false,
            error: "Link is paused by the owner",
          };
        }

        return {
          success: true,
          config: {
            selectedPropertyIds: tokenData.selectedPropertyIds,
            selectedCity: tokenData.selectedCity,
            dashboardView: tokenData.dashboardView,
            dateFrom: tokenData.dateFrom,
            dateTo: tokenData.dateTo,
            displayName: tokenData.displayName,
          },
        };
      } catch (error) {
        console.error("Error retrieving shareable token config:", error);
        return {
          success: false,
          error: "Failed to retrieve token configuration",
        };
      }
    }),

  /**
   * Get all shareable links created by the current user.
   */
  getMyShareableLinks: protectedProcedure.query(async ({ ctx }) => {
    try {
      const tokens = await getShareableTokensByUserId(ctx.user.id);

      return {
        success: true,
        links: tokens.map((t) => ({
          id: t.id,
          token: t.token,
          shareUrl: `/share/${t.token}`,
          displayName: t.displayName,
          selectedCity: t.selectedCity,
          dashboardView: t.dashboardView,
          propertyCount: t.selectedPropertyIds?.length || 0,
          accessCount: t.accessCount,
          isPaused: t.isPaused || 0,
          allowedDomains: t.allowedDomains || [],
          lastAccessedAt: t.lastAccessedAt,
          expiresAt: t.expiresAt,
          createdAt: t.createdAt,
        })),
      };
    } catch (error) {
      console.error("Error retrieving shareable links:", error);
      throw error;
    }
  }),

  /**
   * Delete a shareable link by its ID.
   */
  deleteShareableLink: protectedProcedure
    .input(z.object({ tokenId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      try {
        // Verify ownership by checking if token belongs to user
        const tokens = await getShareableTokensByUserId(ctx.user.id);
        const tokenExists = tokens.some((t) => t.id === input.tokenId);

        if (!tokenExists) {
          throw new Error("Token not found or you do not have permission to delete it");
        }

        const success = await deleteShareableToken(input.tokenId);

        return {
          success,
          message: success ? "Shareable link deleted successfully" : "Failed to delete shareable link",
        };
      } catch (error) {
        console.error("Error deleting shareable link:", error);
        throw error;
      }
    }),

  /**
   * Update the access list (allowed domains) for a shareable link.
   */
  updateLinkAccess: protectedProcedure
    .input(z.object({ tokenId: z.number(), allowedDomains: z.array(z.string()) }))
    .mutation(async ({ ctx, input }) => {
      try {
        const tokens = await getShareableTokensByUserId(ctx.user.id);
        const tokenExists = tokens.some((t) => t.id === input.tokenId);

        if (!tokenExists) {
          throw new Error("Token not found or you do not have permission to modify it");
        }

        const success = await updateShareableTokenAccess(input.tokenId, input.allowedDomains);

        return { success };
      } catch (error) {
        console.error("Error updating shareable link access:", error);
        throw error;
      }
    }),

  // ============ Property Filter Preset Functions ============

  /**
   * Create a new property filter preset.
   */
  createFilterPreset: protectedProcedure
    .input(
      z.object({
        presetName: z.string().min(1),
        propertyIds: z.array(z.string()),
        city: z.string(),
        datePeriod: z.string().optional().default("Last 30 Days"),
        isFavorite: z.number().optional().default(0),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const preset = await createFilterPreset({
          userId: ctx.user.id,
          presetName: input.presetName,
          propertyIds: input.propertyIds,
          city: input.city,
          isFavorite: input.isFavorite,
        });


        if (!preset) {
          throw new Error("Failed to create filter preset");
        }

        return {
          success: true,
          preset,
        };
      } catch (error) {
        console.error("Error creating filter preset:", error);
        throw error;
      }
    }),

  /**
   * Get all filter presets for the current user.
   */
  getMyFilterPresets: protectedProcedure.query(async ({ ctx }) => {
    try {
      const presets = await getFilterPresetsByUserId(ctx.user.id);

      return {
        success: true,
        presets,
      };
    } catch (error) {
      console.error("Error retrieving filter presets:", error);
      throw error;
    }
  }),

  /**
   * Update a filter preset.
   */
  updateFilterPreset: protectedProcedure
    .input(
      z.object({
        presetId: z.number(),
        presetName: z.string().optional(),
        propertyIds: z.array(z.string()).optional(),
        city: z.string().optional(),
        isFavorite: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Verify ownership
        const presets = await getFilterPresetsByUserId(ctx.user.id);
        const presetExists = presets.some((p: any) => p.id === input.presetId);

        if (!presetExists) {
          throw new Error("Preset not found or you do not have permission to update it");
        }

        const updatedPreset = await updateFilterPreset(input.presetId, {
          presetName: input.presetName,
          propertyIds: input.propertyIds,
          city: input.city,
          isFavorite: input.isFavorite,
        });

        return {
          success: !!updatedPreset,
          preset: updatedPreset,
        };
      } catch (error) {
        console.error("Error updating filter preset:", error);
        throw error;
      }
    }),

  /**
   * Delete a filter preset.
   */
  deleteFilterPreset: protectedProcedure
    .input(z.object({ presetId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      try {
        // Verify ownership
        const presets = await getFilterPresetsByUserId(ctx.user.id);
        const presetExists = presets.some((p: any) => p.id === input.presetId);

        if (!presetExists) {
          throw new Error("Preset not found or you do not have permission to delete it");
        }

        const success = await deleteFilterPreset(input.presetId);

        return {
          success,
          message: success ? "Filter preset deleted successfully" : "Failed to delete filter preset",
        };
      } catch (error) {
        console.error("Error deleting filter preset:", error);
        throw error;
      }
    }),
});
