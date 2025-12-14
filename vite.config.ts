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
          /^\/@.+$/,
          /^\/src\/client\.ts$/,
          /^\/src\/style\.css$/,
          /\?t\=\d+$/,
          /^\/favicon\.ico$/,
          /^\/static\/.+$/,
          /^\/node_modules\/.*/,
        ],
        injectClientScript: false,
      }),
      {
        name: "full-reload-on-server-change",
        handleHotUpdate({ file, server }) {
          // Trigger full reload for server-side TS files (excluding client.ts)
          if (
            file.endsWith(".ts") &&
            !file.endsWith("client.ts") &&
            !file.includes("node_modules")
          ) {
            console.log(`\n[vite] server file changed: ${file}`);
            server.hot.send({ type: "full-reload" });
            return [];
          }
        },
      },
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
