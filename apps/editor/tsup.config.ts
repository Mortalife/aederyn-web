import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.tsx"],
  outDir: "dist",
  format: ["esm"],
  target: "node20",
  clean: true,
  sourcemap: true,
});
