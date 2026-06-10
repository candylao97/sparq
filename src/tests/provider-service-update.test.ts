import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Data-integrity tests for updateProviderProfile (the critical requirement of
 * the ClassPass restructure): partial saves must NEVER wipe fields/relations
 * they don't include. We mock the Prisma client so no real DB is touched and
 * assert exactly which calls the service makes for a given partial payload.
 */

const update = vi.fn();
const deleteMany = vi.fn();
const createMany = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    providerProfile: {
      update: (...args: unknown[]) => update(...args),
    },
    providerSuburb: {
      deleteMany: (...args: unknown[]) => deleteMany(...args),
      createMany: (...args: unknown[]) => createMany(...args),
    },
  },
}));

import { updateProviderProfile } from "@/server/services/provider.service";

describe("updateProviderProfile (partial-update data safety)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    update.mockResolvedValue({ id: "profile_1" });
  });

  it("passes only the provided scalar fields to prisma.update", async () => {
    await updateProviderProfile("user_1", {
      businessName: "Luxe Nails",
      bio: "We provide premium nail care services in Melbourne.",
    });

    expect(update).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledWith({
      where: { userId: "user_1" },
      data: {
        businessName: "Luxe Nails",
        bio: "We provide premium nail care services in Melbourne.",
      },
    });
    // The data payload must NOT carry a `suburbs` key (it's split out before update).
    expect(update.mock.calls[0][0].data).not.toHaveProperty("suburbs");
  });

  it("does NOT touch the suburbs relation when suburbs is omitted", async () => {
    await updateProviderProfile("user_1", { businessName: "Luxe Nails" });

    // The whole point: a profile-only save must leave the suburbs join table alone.
    expect(deleteMany).not.toHaveBeenCalled();
    expect(createMany).not.toHaveBeenCalled();
  });

  it("does NOT touch the suburbs relation for a serviceTypes-only save", async () => {
    await updateProviderProfile("user_1", { serviceTypes: ["NAILS", "LASHES"] });

    expect(update).toHaveBeenCalledWith({
      where: { userId: "user_1" },
      data: { serviceTypes: ["NAILS", "LASHES"] },
    });
    expect(deleteMany).not.toHaveBeenCalled();
    expect(createMany).not.toHaveBeenCalled();
  });

  it("replaces suburbs only when suburbs is provided", async () => {
    await updateProviderProfile("user_1", {
      serviceMode: "STUDIO",
      suburbs: ["Carlton", "Fitzroy"],
    });

    expect(deleteMany).toHaveBeenCalledWith({ where: { profileId: "profile_1" } });
    expect(createMany).toHaveBeenCalledWith({
      data: [
        { profileId: "profile_1", suburb: "Carlton" },
        { profileId: "profile_1", suburb: "Fitzroy" },
      ],
    });
    // suburbs must be stripped from the scalar update payload.
    expect(update.mock.calls[0][0].data).not.toHaveProperty("suburbs");
    expect(update.mock.calls[0][0].data).toEqual({ serviceMode: "STUDIO" });
  });

  it("does not wipe suburbs when an empty location-only save omits suburbs", async () => {
    // An empty object means 'nothing to change' — no relation writes.
    await updateProviderProfile("user_1", {});

    expect(update).toHaveBeenCalledWith({
      where: { userId: "user_1" },
      data: {},
    });
    expect(deleteMany).not.toHaveBeenCalled();
    expect(createMany).not.toHaveBeenCalled();
  });
});
