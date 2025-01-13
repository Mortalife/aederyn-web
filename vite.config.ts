// import { defineConfig } from "vite";

// export default defineConfig({
//   build: {
//     manifest: true,
//     rollupOptions: {
//       input: "/src/client.ts",
//     },
//   },
// });

import { defineConfig } from "vite";
import build from "@hono/vite-build/bun";

// import build from '@hono/vite-build/cloudflare-pages'
// import build from '@hono/vite-build/cloudflare-workers'
// import build from '@hono/vite-build/node'

export default defineConfig(({ mode }) => {
  if (mode === "client") {
    return {
      build: {
        rollupOptions: {
          input: "./src/client.ts",
          output: {
            dir: "./dist/static",
            entryFileNames: "client.js",
          },
        },
        copyPublicDir: false,
      },
    };
  } else {
    return {
      plugins: [build()],
    };
  }
});
