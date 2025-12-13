import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/cron.ts", "src/backup.ts"],
  outDir: "dist/code",
  target: "node24",
  format: "esm",
  splitting: false,
  sourcemap: true,
  clean: true,
  minify: true,
});
