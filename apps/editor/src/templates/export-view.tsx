import type { FC } from "hono/jsx";
import type { ExportResult } from "../services/export.js";
import { formatBytes } from "../services/export.js";

interface ExportViewProps {
  jsonExport: ExportResult;
  tsExport: ExportResult;
}

export const ExportView: FC<ExportViewProps> = ({ jsonExport, tsExport }) => {
  return (
    <div id="main-content">
      <div class="flex justify-between items-center mb-6">
        <h1 class="text-2xl font-bold text-white">📤 Export Data</h1>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* JSON Export */}
        <div class="bg-gray-800 rounded-lg p-6">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-lg font-semibold text-emerald-400 flex items-center gap-2">
              <span>📄</span>
              <span>JSON Export</span>
            </h2>
            <span class="text-sm text-gray-400">{formatBytes(jsonExport.totalSize)}</span>
          </div>
          <p class="text-sm text-gray-400 mb-4">
            Raw JSON data files for storage or external tools.
          </p>
          <div class="space-y-2 mb-4">
            {jsonExport.files.map((file) => (
              <div key={file.filename} class="flex items-center justify-between p-2 bg-gray-700 rounded">
                <span class="text-sm text-gray-300 font-mono">{file.filename}</span>
                <span class="text-xs text-gray-500">{formatBytes(file.size)}</span>
              </div>
            ))}
          </div>
          <form method="post" action="/commands/export/json">
            <button
              type="submit"
              class="w-full px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded text-white font-medium transition"
            >
              Download JSON Files
            </button>
          </form>
        </div>

        {/* TypeScript Export */}
        <div class="bg-gray-800 rounded-lg p-6">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-lg font-semibold text-blue-400 flex items-center gap-2">
              <span>📘</span>
              <span>TypeScript Export</span>
            </h2>
            <span class="text-sm text-gray-400">{formatBytes(tsExport.totalSize)}</span>
          </div>
          <p class="text-sm text-gray-400 mb-4">
            Type-safe TypeScript files with interfaces and exports.
          </p>
          <div class="space-y-2 mb-4">
            {tsExport.files.map((file) => (
              <div key={file.filename} class="flex items-center justify-between p-2 bg-gray-700 rounded">
                <span class="text-sm text-gray-300 font-mono">{file.filename}</span>
                <span class="text-xs text-gray-500">{formatBytes(file.size)}</span>
              </div>
            ))}
          </div>
          <form method="post" action="/commands/export/typescript">
            <button
              type="submit"
              class="w-full px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded text-white font-medium transition"
            >
              Download TypeScript Files
            </button>
          </form>
        </div>
      </div>

      {/* Preview Section */}
      <div class="mt-6 bg-gray-800 rounded-lg p-6">
        <h2 class="text-lg font-semibold text-white mb-4">Preview</h2>
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <h3 class="text-sm font-semibold text-gray-400 mb-2">JSON Sample (items.json)</h3>
            <pre class="p-4 bg-gray-900 rounded text-xs text-gray-300 overflow-auto max-h-64 font-mono">
              {jsonExport.files[0]?.content.slice(0, 500)}
              {(jsonExport.files[0]?.content.length || 0) > 500 && "\n..."}
            </pre>
          </div>
          <div>
            <h3 class="text-sm font-semibold text-gray-400 mb-2">TypeScript Sample (items.ts)</h3>
            <pre class="p-4 bg-gray-900 rounded text-xs text-gray-300 overflow-auto max-h-64 font-mono">
              {tsExport.files[0]?.content.slice(0, 500)}
              {(tsExport.files[0]?.content.length || 0) > 500 && "\n..."}
            </pre>
          </div>
        </div>
      </div>

      {/* Copy to Web App Section */}
      <div class="mt-6 bg-gray-800 rounded-lg p-6 border border-amber-500/30">
        <h2 class="text-lg font-semibold text-amber-400 mb-2 flex items-center gap-2">
          <span>⚡</span>
          <span>Quick Deploy to Game</span>
        </h2>
        <p class="text-sm text-gray-400 mb-4">
          Copy exported TypeScript files directly to the game's config directory.
        </p>
        <form method="post" action="/commands/export/deploy">
          <button
            type="submit"
            class="px-4 py-2 bg-amber-600 hover:bg-amber-500 rounded text-white font-medium transition"
          >
            Deploy to apps/web/src/config/
          </button>
        </form>
        <p class="text-xs text-gray-500 mt-2">
          This will overwrite existing config files in the web app.
        </p>
      </div>
    </div>
  );
};
