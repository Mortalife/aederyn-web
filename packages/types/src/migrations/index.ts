export interface Migration<TOld, TNew> {
  entityType: string;
  fromVersion: number;
  toVersion: number;
  description: string;
  
  up(data: TOld): TNew;
  down(data: TNew): TOld;
  validate(data: unknown): data is TNew;
}

export type AnyMigration = Migration<unknown, unknown>;

export * from "./migration-runner.js";
export * from "./entity-migrations.js";
