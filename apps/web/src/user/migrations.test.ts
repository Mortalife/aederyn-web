import { describe, it, expect } from "vitest";
import {
  migrateUser,
  needsMigration,
  getUserVersion,
  getCurrentVersion,
} from "./migrations.js";
import { USER_VERSION, type GameUserModel } from "../config.js";

const createTestUser = (overrides: Partial<GameUserModel> = {}): GameUserModel => ({
  id: "test-user",
  v: USER_VERSION,
  p: { x: 10, y: 10 },
  z: false,
  s: {},
  i: [],
  e: {},
  h: 100,
  po: 100,
  m: 100,
  $: 0,
  ...overrides,
});

describe("migrations", () => {
  describe("getUserVersion", () => {
    it("returns version from user", () => {
      const user = createTestUser({ v: 5 });
      expect(getUserVersion(user)).toBe(5);
    });

    it("returns 0 for user without version", () => {
      const user = createTestUser();
      // @ts-expect-error - testing legacy user without version
      delete user.v;
      expect(getUserVersion(user)).toBe(0);
    });
  });

  describe("getCurrentVersion", () => {
    it("returns USER_VERSION constant", () => {
      expect(getCurrentVersion()).toBe(USER_VERSION);
    });
  });

  describe("needsMigration", () => {
    it("returns false when user is at current version", () => {
      const user = createTestUser({ v: USER_VERSION });
      expect(needsMigration(user)).toBe(false);
    });

    it("returns true when user is below current version", () => {
      const user = createTestUser({ v: USER_VERSION - 1 });
      expect(needsMigration(user)).toBe(true);
    });

    it("returns true for legacy user without version", () => {
      const user = createTestUser();
      // @ts-expect-error - testing legacy user without version
      delete user.v;
      expect(needsMigration(user)).toBe(true);
    });
  });

  describe("migrateUser", () => {
    it("returns user unchanged if already at current version", () => {
      const user = createTestUser({ v: USER_VERSION });
      const result = migrateUser(user);
      expect(result).toEqual(user);
    });

    it("sets version to USER_VERSION after migration", () => {
      const user = createTestUser();
      // @ts-expect-error - testing legacy user without version
      delete user.v;
      const result = migrateUser(user);
      expect(result.v).toBe(USER_VERSION);
    });

    it("migrates legacy user (v0) to current version", () => {
      const legacyUser = {
        id: "legacy-user",
        p: { x: 5, y: 5 },
        z: false,
        s: {},
        i: [],
        e: {},
        h: 100,
        po: 100,
        m: 100,
      } as unknown as GameUserModel;

      const result = migrateUser(legacyUser);

      expect(result.v).toBe(USER_VERSION);
      expect(result.$).toBe(0);
    });

    it("preserves existing user data during migration", () => {
      const user = createTestUser({
        id: "preserve-test",
        p: { x: 15, y: 20 },
        h: 50,
      });
      // @ts-expect-error - testing legacy user without version
      delete user.v;

      const result = migrateUser(user);

      expect(result.id).toBe("preserve-test");
      expect(result.p).toEqual({ x: 15, y: 20 });
      expect(result.h).toBe(50);
    });

    it("does not mutate original user object", () => {
      const user = createTestUser();
      // @ts-expect-error - testing legacy user without version
      delete user.v;
      const originalId = user.id;

      migrateUser(user);

      expect(user.id).toBe(originalId);
      expect(user.v).toBeUndefined();
    });
  });
});
