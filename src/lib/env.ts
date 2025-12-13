import z from "zod";

const envSchema = z.object({
  ANTHROPIC_API_KEY: z.string(),
  OPENAI_API_KEY: z.string(),
  GENERATION_ENABLED: z.string().transform((v) => v === "true"),
});

export const env = envSchema.parse(process.env);
