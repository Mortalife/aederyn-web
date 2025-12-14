import { USER_VERSION, type GameUserModel } from "../config.js";

export type Migration = {
  version: number;
  up: (user: GameUserModel) => GameUserModel;
};

const migrations: Migration[] = [
  {
    version: 1,
    up: (user) => ({
      ...user,
      v: 1,
      $: 0,
    }),
  },
];

export const getCurrentVersion = (): number => USER_VERSION;

export const getUserVersion = (user: GameUserModel): number => user.v ?? 0;

export const migrateUser = (user: GameUserModel): GameUserModel => {
  let currentVersion = getUserVersion(user);
  let migratedUser = { ...user };

  const pendingMigrations = migrations
    .filter((m) => m.version > currentVersion)
    .sort((a, b) => a.version - b.version);

  for (const migration of pendingMigrations) {
    migratedUser = migration.up(migratedUser);
    currentVersion = migration.version;
  }

  if (migratedUser.v !== USER_VERSION) {
    migratedUser.v = USER_VERSION;
  }

  return migratedUser;
};

export const needsMigration = (user: GameUserModel): boolean => {
  return getUserVersion(user) < USER_VERSION;
};
