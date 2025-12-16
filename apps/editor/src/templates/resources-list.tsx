import type { FC } from "hono/jsx";
import type { Resource } from "../repository/index.js";

interface ResourcesListProps {
  resources: Resource[];
}

export const ResourcesList: FC<ResourcesListProps> = ({ resources }) => {
  return (
    <div id="main-content">
      <div class="flex justify-between items-center mb-6">
        <h1 class="text-2xl font-bold text-white">🪨 Resources</h1>
        <a
          href="/resources/new"
          data-testid="new-resource-btn"
          class="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded text-white font-medium transition"
        >
          + New Resource
        </a>
      </div>

      <div class="bg-gray-800 rounded-lg overflow-hidden">
        <table data-testid="resources-table" class="w-full">
          <thead class="bg-gray-700">
            <tr>
              <th class="px-4 py-3 text-left text-sm font-medium text-gray-300">Name</th>
              <th class="px-4 py-3 text-left text-sm font-medium text-gray-300">ID</th>
              <th class="px-4 py-3 text-left text-sm font-medium text-gray-300">Type</th>
              <th class="px-4 py-3 text-left text-sm font-medium text-gray-300">Time</th>
              <th class="px-4 py-3 text-left text-sm font-medium text-gray-300">Yields</th>
              <th class="px-4 py-3 text-right text-sm font-medium text-gray-300">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-700">
            {resources.length === 0 ? (
              <tr>
                <td colspan={6} class="px-4 py-8 text-center text-gray-400">
                  No resources found. Create your first resource!
                </td>
              </tr>
            ) : (
              resources.map((resource) => (
                <tr key={resource.id} class="hover:bg-gray-700/50 transition">
                  <td class="px-4 py-3 text-white font-medium">{resource.name}</td>
                  <td class="px-4 py-3 text-gray-400 font-mono text-sm">{resource.id}</td>
                  <td class="px-4 py-3">
                    <span class={`px-2 py-1 rounded text-xs font-medium ${getResourceTypeColor(resource.type)}`}>
                      {resource.type}
                    </span>
                  </td>
                  <td class="px-4 py-3 text-gray-300">{resource.collectionTime}s</td>
                  <td class="px-4 py-3 text-gray-300">
                    {resource.reward_items.map((r) => r.item_id).join(", ")}
                  </td>
                  <td class="px-4 py-3 text-right">
                    <a
                      href={`/resources/${resource.id}`}
                      class="text-blue-400 hover:text-blue-300 mr-3"
                    >
                      Edit
                    </a>
                    <form
                      method="post"
                      action={`/commands/resources/${resource.id}/delete`}
                      class="inline"
                    >
                      <button
                        type="submit"
                        data-testid="delete-btn"
                        class="text-red-400 hover:text-red-300"
                      >
                        Delete
                      </button>
                    </form>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

function getResourceTypeColor(type: string): string {
  const colors: Record<string, string> = {
    resource: "bg-emerald-500/20 text-emerald-400",
    workbench: "bg-blue-500/20 text-blue-400",
    furnace: "bg-orange-500/20 text-orange-400",
    magic: "bg-purple-500/20 text-purple-400",
  };
  return colors[type] || colors.resource;
}
