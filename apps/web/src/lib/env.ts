import z from "zod";

const envSchema = z.object({
  ANTHROPIC_API_KEY: z.string(),
  GENERATION_ENABLED: z
    .string()
    .default("true")
    .transform((v) => v === "true"),
  SESSION_SECRET: z.string().default("secret-key-that-should-be-very-secret"),
  DATABASE_PATH: z.string().optional().default(""), // Default to current directory
});

export const env = envSchema.parse(process.env);
