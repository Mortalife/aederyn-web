import { defineConfig, loadEnv } from "vite";
import devServer from "@hono/vite-dev-server";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  process.env = { ...process.env, ...env };

  return {
    server: {
      port: 3000,
    },
    plugins: [
      devServer({
        entry: "src/index.ts",
        exclude: [
          /.*\.css$/,
          /.*\.ts$/,
          /.*\.tsx$/,
          /^\/@.+$/,
          /\?t\=\d+$/,
          /^\/favicon\.ico$/,
          /^\/static\/.+$/,
          /^\/node_modules\/.+$/,
        ],
        injectClientScript: false,
      }),
    ],
    build: {
      manifest: true,
      rollupOptions: {
        input: "./src/client.ts",
        output: {
          dir: "./dist/static",
          entryFileNames: "assets/client.js",
        },
      },
      copyPublicDir: false,
    },
  };
});
