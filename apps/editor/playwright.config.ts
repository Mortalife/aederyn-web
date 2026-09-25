import { defineConfig } from "@playwright/test";

const port = 3102;

export default defineConfig({
  testDir: "tests",
  use: { baseURL: `http://localhost:${port}` },
  webServer: {
    command: `pnpm exec vite --port ${port} --strictPort`,
    url: `http://localhost:${port}/items`,
    reuseExistingServer: !process.env.CI,
  },
});
