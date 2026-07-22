import { describe, expect, it } from "vitest";
import { appRouter } from "../routers";
import type { TrpcContext } from "../_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };

  return { ctx };
}

describe("Filter Preset Procedures", () => {
  it("should create a filter preset", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.sharing.createFilterPreset({
      presetName: "London Top 5 - Q2",
      propertyIds: ["prop1", "prop2", "prop3"],
      city: "London",
      datePeriod: "Last 30 Days",
      isFavorite: 0,
    });

    expect(result.success).toBe(true);
    expect(result.preset).toBeDefined();
    expect(result.preset?.presetName).toBe("London Top 5 - Q2");
    expect(result.preset?.propertyIds).toEqual(["prop1", "prop2", "prop3"]);
    expect(result.preset?.city).toBe("London");
    expect(result.preset?.datePeriod).toBe("Last 30 Days");
  });

  it("should retrieve user's filter presets", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Create a preset first
    await caller.sharing.createFilterPreset({
      presetName: "Test Preset",
      propertyIds: ["prop1"],
      city: "Manchester",
      datePeriod: "Last 7 Days",
    });

    // Retrieve presets
    const result = await caller.sharing.getMyFilterPresets();

    expect(result.success).toBe(true);
    expect(Array.isArray(result.presets)).toBe(true);
    expect(result.presets.length).toBeGreaterThan(0);
  });

  it("should update a filter preset", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Create a preset
    const createResult = await caller.sharing.createFilterPreset({
      presetName: "Original Name",
      propertyIds: ["prop1"],
      city: "Leeds",
      datePeriod: "Last 30 Days",
    });

    const presetId = createResult.preset?.id;
    expect(presetId).toBeDefined();

    // Update the preset
    const updateResult = await caller.sharing.updateFilterPreset({
      presetId: presetId!,
      presetName: "Updated Name",
      propertyIds: ["prop1", "prop2"],
      city: "Leeds",
      isFavorite: 1,
    });

    expect(updateResult.success).toBe(true);
    expect(updateResult.preset?.presetName).toBe("Updated Name");
    expect(updateResult.preset?.isFavorite).toBe(1);
  });

  it("should delete a filter preset", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Create a preset
    const createResult = await caller.sharing.createFilterPreset({
      presetName: "To Delete",
      propertyIds: ["prop1"],
      city: "Birmingham",
      datePeriod: "Last Quarter",
    });

    const presetId = createResult.preset?.id;
    expect(presetId).toBeDefined();

    // Delete the preset
    const deleteResult = await caller.sharing.deleteFilterPreset({
      presetId: presetId!,
    });

    expect(deleteResult.success).toBe(true);
  });

  it("should prevent unauthorized preset updates", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Try to update a non-existent preset
    const updateResult = await caller.sharing.updateFilterPreset({
      presetId: 99999,
      presetName: "Unauthorized",
      propertyIds: ["prop1"],
      city: "London",
    });

    expect(updateResult.success).toBe(false);
  });

  it("should handle empty property list in preset", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.sharing.createFilterPreset({
      presetName: "Empty Properties",
      propertyIds: [],
      city: "All",
      datePeriod: "Last 30 Days",
    });

    expect(result.success).toBe(true);
    expect(result.preset?.propertyIds).toEqual([]);
  });

  it("should support favorite/unfavorite toggling", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Create a preset (not favorite)
    const createResult = await caller.sharing.createFilterPreset({
      presetName: "Toggle Favorite",
      propertyIds: ["prop1"],
      city: "Glasgow",
      isFavorite: 0,
    });

    const presetId = createResult.preset?.id;

    // Toggle to favorite
    const favoriteResult = await caller.sharing.updateFilterPreset({
      presetId: presetId!,
      presetName: "Toggle Favorite",
      propertyIds: ["prop1"],
      city: "Glasgow",
      isFavorite: 1,
    });

    expect(favoriteResult.preset?.isFavorite).toBe(1);

    // Toggle back to non-favorite
    const unfavoriteResult = await caller.sharing.updateFilterPreset({
      presetId: presetId!,
      presetName: "Toggle Favorite",
      propertyIds: ["prop1"],
      city: "Glasgow",
      isFavorite: 0,
    });

    expect(unfavoriteResult.preset?.isFavorite).toBe(0);
  });
});
