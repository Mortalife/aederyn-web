export const env = {
  SESSION_SECRET: process.env.SESSION_SECRET ?? "secret-key-that-should-be-very-secret",
  DATABASE_PATH: process.env.DATABASE_PATH ?? "",
};
