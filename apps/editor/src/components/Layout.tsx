import type { FC, PropsWithChildren } from "hono/jsx";
import { Sidebar } from "./Sidebar.js";
import { Header } from "./Header.js";
import { StatusBar } from "./StatusBar.js";

interface LayoutProps {
  title: string;
  sseEndpoint?: string;
  counts?: {
    items: number;
    resources: number;
    tiles: number;
    npcs: number;
    quests: number;
    houseTiles: number;
  };
}

export const Layout: FC<PropsWithChildren<LayoutProps>> = ({
  title,
  sseEndpoint,
  counts,
  children,
}) => {
  return (
    <html lang="en" class="dark">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{title} | Game Design GUI</title>
        <link rel="stylesheet" href="/src/style.css" />
        <script
          type="module"
          src="https://cdn.jsdelivr.net/gh/starfederation/datastar@v1.0.0-RC.6/bundles/datastar.js"
        ></script>
        <script type="module" src="/src/client.ts"></script>
      </head>
      <body class="bg-gray-900 text-gray-100 min-h-screen flex flex-col">
        <div class="flex flex-1">
          <Sidebar />
          <div class="flex-1 flex flex-col">
            <Header />
            <main data-testid="content" class="flex-1 p-6 overflow-auto">
              {sseEndpoint ? (
                <div data-init={`@get('${sseEndpoint}')`}>
                  <div
                    id="main-content"
                    class="flex items-center justify-center h-64"
                  >
                    <div class="text-gray-400">Loading...</div>
                  </div>
                </div>
              ) : (
                children
              )}
            </main>
          </div>
        </div>
        <StatusBar counts={counts} />
      </body>
    </html>
  );
};
