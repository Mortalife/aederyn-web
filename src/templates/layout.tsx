import { html, raw } from "hono/html";
import { GameContainer } from "./game.js";
import path from "node:path";
import { readFile } from "node:fs/promises";
import { isProduction } from "../lib/runtime.js";

let css = "";

if (isProduction()) {
  try {
    const manifestContent = await readFile(
      path.join(process.cwd(), "./dist/static/.vite/manifest.json"),
      "utf-8"
    );
    const manifest = JSON.parse(manifestContent);
    css = manifest["src/client.ts"].css[0];
  } catch (e) {
    console.error("Failed to load production manifest:", e);
  }
}

interface SiteData {
  title: string;
  description: string;
  image: string;
  children?: any;
}
const Layout = async (props: SiteData) => {
  return html`
  <html>
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${props.title}</title>
    <meta name="description" content="${props.description}">
    <head prefix="og: http://ogp.me/ns#">
    <meta property="og:type" content="article">
    <!-- More elements slow down JSX, but not template literals. -->
    <meta property="og:title" content="${props.title}">
    <meta property="og:image" content="${props.image}">
    
    <script type="importmap">
    {
      "imports": {
        "datastar": "https://cdn.jsdelivr.net/gh/starfederation/datastar@v1.0.0-RC.6/bundles/datastar.js"
      }
    }
    </script>
    <script type="module" src="https://cdn.jsdelivr.net/npm/@mbolli/datastar-attribute-on-keys@v1.1.0/dist/index.js"></script>
    ${
      isProduction()
        ? raw(`<script type="module" src="/static/assets/client.js"></script>
          <link rel="stylesheet" href="/static/${css}">`)
        : raw('<script type="module" src="/src/client.ts"></script>')
    }

    <link rel="prefetch" href="/textures/cliff-texture.webp" as="image">
    <link rel="prefetch" href="/textures/grass-texture.webp" as="image">
    <link rel="prefetch" href="/textures/tree-texture.webp" as="image">
    <link rel="prefetch" href="/textures/water-texture.webp" as="image">
    <link rel="prefetch" href="/textures/camp-texture.webp" as="image">
    <link rel="prefetch" href="/textures/settlement-texture.webp" as="image">
  </head>
  <body class="p-4">
    ${props.children}
  </body>
  </html>
  `;
};

const Content = async (props: { siteData: SiteData; user_id: string }) => {
  return Layout({
    ...props.siteData,
    children: GameContainer({ user_id: props.user_id }),
  });
};

export { Layout, Content };
