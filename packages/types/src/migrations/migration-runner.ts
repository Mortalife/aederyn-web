import type { Migration, AnyMigration } from "./index.js";

export interface MigrationRegistry {
  migrations: Map<string, AnyMigration[]>;
  register<TOld, TNew>(migration: Migration<TOld, TNew>): void;
  getMigrations(entityType: string): AnyMigration[];
  getMigrationPath(entityType: string, fromVersion: number, toVersion: number): AnyMigration[];
}

export function createMigrationRegistry(): MigrationRegistry {
  const migrations = new Map<string, AnyMigration[]>();

  return {
    migrations,

    register<TOld, TNew>(migration: Migration<TOld, TNew>): void {
      const existing = migrations.get(migration.entityType) || [];
      existing.push(migration as AnyMigration);
      existing.sort((a, b) => a.fromVersion - b.fromVersion);
      migrations.set(migration.entityType, existing);
    },

    getMigrations(entityType: string): AnyMigration[] {
      return migrations.get(entityType) || [];
    },

    getMigrationPath(entityType: string, fromVersion: number, toVersion: number): AnyMigration[] {
      const entityMigrations = migrations.get(entityType) || [];
      
      if (fromVersion < toVersion) {
        // Upgrade path
        return entityMigrations.filter(
          (m) => m.fromVersion >= fromVersion && m.toVersion <= toVersion
        );
      } else if (fromVersion > toVersion) {
        // Downgrade path
        return entityMigrations
          .filter((m) => m.toVersion <= fromVersion && m.fromVersion >= toVersion)
          .reverse();
      }
      
      return [];
    },
  };
}

export interface MigrationResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  migrationsApplied: string[];
}

export function runMigrations<T>(
  registry: MigrationRegistry,
  entityType: string,
  data: unknown,
  fromVersion: number,
  toVersion: number
): MigrationResult<T> {
  const path = registry.getMigrationPath(entityType, fromVersion, toVersion);
  const migrationsApplied: string[] = [];
  
  let current = data;
  const isUpgrade = fromVersion < toVersion;

  for (const migration of path) {
    try {
      if (isUpgrade) {
        current = migration.up(current);
      } else {
        current = migration.down(current);
      }
      migrationsApplied.push(
        `${migration.entityType}: v${migration.fromVersion} -> v${migration.toVersion}`
      );
    } catch (error) {
      return {
        success: false,
        error: `Migration failed at ${migration.entityType} v${migration.fromVersion} -> v${migration.toVersion}: ${error}`,
        migrationsApplied,
      };
    }
  }

  // Validate final result if we have a validator
  const lastMigration = path[path.length - 1];
  if (lastMigration && isUpgrade && !lastMigration.validate(current)) {
    return {
      success: false,
      error: `Validation failed after migrations`,
      migrationsApplied,
    };
  }

  return {
    success: true,
    data: current as T,
    migrationsApplied,
  };
}
