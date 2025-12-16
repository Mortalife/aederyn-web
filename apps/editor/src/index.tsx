import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { streamSSE } from "hono/streaming";
import type { EquipSlot, QuestType } from "@aederyn/types";
import { Layout } from "./components/Layout.js";
import { repository } from "./repository/index.js";
import { fragmentEvent } from "./sse/index.js";
import {
  PubSub,
  ITEMS_UPDATED,
  RESOURCES_UPDATED,
  TILES_UPDATED,
  NPCS_UPDATED,
  QUESTS_UPDATED,
  HOUSE_TILES_UPDATED,
} from "./sse/pubsub.js";
import { Dashboard } from "./templates/dashboard.js";
import { ItemsList } from "./templates/items-list.js";
import { ResourcesList } from "./templates/resources-list.js";
import { TilesList } from "./templates/tiles-list.js";
import { NPCsList } from "./templates/npcs-list.js";
import { QuestsList } from "./templates/quests-list.js";
import { HouseTilesList } from "./templates/house-tiles-list.js";
import { ItemForm } from "./templates/item-form.js";
import { ResourceForm } from "./templates/resource-form.js";
import { TileForm } from "./templates/tile-form.js";
import { NPCForm } from "./templates/npc-form.js";
import { QuestForm } from "./templates/quest-form.js";
import { HouseTileForm } from "./templates/house-tile-form.js";
import { GraphView } from "./templates/graph-view.js";
import { buildGraphData } from "./services/graph-builder.js";
import { findUsedBy } from "./services/references.js";
import { runValidation } from "./services/validation.js";
import { ValidationView } from "./templates/validation-view.js";
import { ExportView } from "./templates/export-view.js";
import { exportToJson, exportToTypeScript } from "./services/export.js";
import { parseItemQuantityList, parseRequiredItemList, parseStringArray, parseItemDurability, parseItemAttributes, parseItemRequirements, parseItemEffects, parseRelationships, parseObjectives, parseRewards, parseCompletion } from "./utils/form-parser.js";
import { analyzeImpact, type EntityType } from "./services/impact-analysis.js";
import { ImpactView } from "./templates/impact-view.js";
import { WorldOverview } from "./templates/world-overview.js";
import { WorldSettingForm } from "./templates/world-setting-form.js";
import { WorldRegionsList } from "./templates/world-regions-list.js";
import { WorldRegionForm } from "./templates/world-region-form.js";
import { WorldFactionsList } from "./templates/world-factions-list.js";
import { WorldFactionForm } from "./templates/world-faction-form.js";
import { WorldHistoryList } from "./templates/world-history-list.js";
import { WorldHistoryForm } from "./templates/world-history-form.js";
import { WorldThemesList } from "./templates/world-themes-list.js";
import { WorldThemeForm } from "./templates/world-theme-form.js";
import { WorldSystemsList } from "./templates/world-systems-list.js";
import { WorldSystemForm } from "./templates/world-system-form.js";
import { WorldNamingForm } from "./templates/world-naming-form.js";
import { AIGenerationView } from "./templates/ai-generation.js";
import { buildAIContext, buildItemGenerationPrompt, buildQuestGenerationPrompt, buildNPCGenerationPrompt } from "./services/ai-context.js";
import type { WorldRegion, WorldFaction, WorldHistoryEvent, WorldTheme, WorldSystem } from "@aederyn/types";

const app = new Hono();

// Dashboard route
app.get("/", async (c) => {
  const counts = await repository.getCounts();
  return c.html(
    <Layout title="Dashboard" sseEndpoint="/sse/dashboard" counts={counts} />
  );
});

// Dashboard SSE
app.get("/sse/dashboard", async (c) => {
  return streamSSE(c, async (stream) => {
    const counts = await repository.getCounts();
    await stream.writeSSE(fragmentEvent(Dashboard({ counts })));

    const handleUpdate = async () => {
      const counts = await repository.getCounts();
      await stream.writeSSE(fragmentEvent(Dashboard({ counts })));
    };

    PubSub.subscribe(ITEMS_UPDATED, handleUpdate);
    PubSub.subscribe(RESOURCES_UPDATED, handleUpdate);
    PubSub.subscribe(TILES_UPDATED, handleUpdate);
    PubSub.subscribe(NPCS_UPDATED, handleUpdate);
    PubSub.subscribe(QUESTS_UPDATED, handleUpdate);
    PubSub.subscribe(HOUSE_TILES_UPDATED, handleUpdate);

    stream.onAbort(() => {
      PubSub.off(ITEMS_UPDATED, handleUpdate);
      PubSub.off(RESOURCES_UPDATED, handleUpdate);
      PubSub.off(TILES_UPDATED, handleUpdate);
      PubSub.off(NPCS_UPDATED, handleUpdate);
      PubSub.off(QUESTS_UPDATED, handleUpdate);
      PubSub.off(HOUSE_TILES_UPDATED, handleUpdate);
    });
  });
});

// Items routes
app.get("/items", async (c) => {
  const counts = await repository.getCounts();
  return c.html(
    <Layout title="Items" sseEndpoint="/sse/items" counts={counts} />
  );
});

app.get("/sse/items", async (c) => {
  return streamSSE(c, async (stream) => {
    const items = await repository.items.getAll();
    await stream.writeSSE(fragmentEvent(ItemsList({ items })));

    const handleUpdate = async () => {
      const items = await repository.items.getAll();
      await stream.writeSSE(fragmentEvent(ItemsList({ items })));
    };

    PubSub.subscribe(ITEMS_UPDATED, handleUpdate);
    stream.onAbort(() => PubSub.off(ITEMS_UPDATED, handleUpdate));
  });
});

// Item form routes
app.get("/items/new", async (c) => {
  const counts = await repository.getCounts();
  return c.html(
    <Layout title="New Item" sseEndpoint="/sse/items/new" counts={counts} />
  );
});

app.get("/sse/items/new", async (c) => {
  return streamSSE(c, async (stream) => {
    await stream.writeSSE(fragmentEvent(ItemForm({ isNew: true })));
  });
});

app.get("/items/:id", async (c) => {
  const counts = await repository.getCounts();
  const id = c.req.param("id");
  return c.html(
    <Layout title="Edit Item" sseEndpoint={`/sse/items/${id}`} counts={counts} />
  );
});

app.get("/sse/items/:id", async (c) => {
  const id = c.req.param("id");
  return streamSSE(c, async (stream) => {
    const item = await repository.items.getById(id);
    const usedBy = await findUsedBy(id);
    if (item) {
      await stream.writeSSE(fragmentEvent(ItemForm({ item, isNew: false, usedBy })));
    } else {
      await stream.writeSSE(fragmentEvent(
        <div id="main-content" class="text-center py-12">
          <h1 class="text-2xl font-bold text-red-400">Item not found</h1>
          <a href="/items" class="text-blue-400 hover:underline mt-4 inline-block">
            ← Back to Items
          </a>
        </div>
      ));
    }
  });
});

// Resources routes
app.get("/resources", async (c) => {
  const counts = await repository.getCounts();
  return c.html(
    <Layout title="Resources" sseEndpoint="/sse/resources" counts={counts} />
  );
});

app.get("/sse/resources", async (c) => {
  return streamSSE(c, async (stream) => {
    const resources = await repository.resources.getAll();
    await stream.writeSSE(fragmentEvent(ResourcesList({ resources })));

    const handleUpdate = async () => {
      const resources = await repository.resources.getAll();
      await stream.writeSSE(fragmentEvent(ResourcesList({ resources })));
    };

    PubSub.subscribe(RESOURCES_UPDATED, handleUpdate);
    stream.onAbort(() => PubSub.off(RESOURCES_UPDATED, handleUpdate));
  });
});

// Resource form routes
app.get("/resources/new", async (c) => {
  const counts = await repository.getCounts();
  return c.html(
    <Layout title="New Resource" sseEndpoint="/sse/resources/new" counts={counts} />
  );
});

app.get("/sse/resources/new", async (c) => {
  return streamSSE(c, async (stream) => {
    const items = await repository.items.getAll();
    await stream.writeSSE(fragmentEvent(ResourceForm({ isNew: true, items })));
  });
});

app.get("/resources/:id", async (c) => {
  const counts = await repository.getCounts();
  const id = c.req.param("id");
  return c.html(
    <Layout title="Edit Resource" sseEndpoint={`/sse/resources/${id}`} counts={counts} />
  );
});

app.get("/sse/resources/:id", async (c) => {
  const id = c.req.param("id");
  return streamSSE(c, async (stream) => {
    const [resource, items] = await Promise.all([
      repository.resources.getById(id),
      repository.items.getAll(),
    ]);
    if (resource) {
      await stream.writeSSE(fragmentEvent(ResourceForm({ resource, isNew: false, items })));
    } else {
      await stream.writeSSE(fragmentEvent(
        <div id="main-content" class="text-center py-12">
          <h1 class="text-2xl font-bold text-red-400">Resource not found</h1>
          <a href="/resources" class="text-blue-400 hover:underline mt-4 inline-block">
            ← Back to Resources
          </a>
        </div>
      ));
    }
  });
});

// Tiles routes
app.get("/tiles", async (c) => {
  const counts = await repository.getCounts();
  return c.html(
    <Layout title="Tiles" sseEndpoint="/sse/tiles" counts={counts} />
  );
});

app.get("/sse/tiles", async (c) => {
  return streamSSE(c, async (stream) => {
    const tiles = await repository.tiles.getAll();
    await stream.writeSSE(fragmentEvent(TilesList({ tiles })));

    const handleUpdate = async () => {
      const tiles = await repository.tiles.getAll();
      await stream.writeSSE(fragmentEvent(TilesList({ tiles })));
    };

    PubSub.subscribe(TILES_UPDATED, handleUpdate);
    stream.onAbort(() => PubSub.off(TILES_UPDATED, handleUpdate));
  });
});

// Tile form routes
app.get("/tiles/new", async (c) => {
  const counts = await repository.getCounts();
  return c.html(
    <Layout title="New Tile" sseEndpoint="/sse/tiles/new" counts={counts} />
  );
});

app.get("/sse/tiles/new", async (c) => {
  return streamSSE(c, async (stream) => {
    const resources = await repository.resources.getAll();
    await stream.writeSSE(fragmentEvent(TileForm({ isNew: true, resources })));
  });
});

app.get("/tiles/:id", async (c) => {
  const counts = await repository.getCounts();
  const id = c.req.param("id");
  return c.html(
    <Layout title="Edit Tile" sseEndpoint={`/sse/tiles/${id}`} counts={counts} />
  );
});

app.get("/sse/tiles/:id", async (c) => {
  const id = c.req.param("id");
  return streamSSE(c, async (stream) => {
    const [tile, resources] = await Promise.all([
      repository.tiles.getById(id),
      repository.resources.getAll(),
    ]);
    if (tile) {
      await stream.writeSSE(fragmentEvent(TileForm({ tile, isNew: false, resources })));
    } else {
      await stream.writeSSE(fragmentEvent(
        <div id="main-content" class="text-center py-12">
          <h1 class="text-2xl font-bold text-red-400">Tile not found</h1>
          <a href="/tiles" class="text-blue-400 hover:underline mt-4 inline-block">
            ← Back to Tiles
          </a>
        </div>
      ));
    }
  });
});

// House Tiles routes
app.get("/house-tiles", async (c) => {
  const counts = await repository.getCounts();
  return c.html(
    <Layout title="House Tiles" sseEndpoint="/sse/house-tiles" counts={counts} />
  );
});

app.get("/sse/house-tiles", async (c) => {
  return streamSSE(c, async (stream) => {
    const houseTiles = await repository.houseTiles.getAll();
    await stream.writeSSE(fragmentEvent(HouseTilesList({ houseTiles })));

    const handleUpdate = async () => {
      const houseTiles = await repository.houseTiles.getAll();
      await stream.writeSSE(fragmentEvent(HouseTilesList({ houseTiles })));
    };

    PubSub.subscribe(HOUSE_TILES_UPDATED, handleUpdate);
    stream.onAbort(() => PubSub.off(HOUSE_TILES_UPDATED, handleUpdate));
  });
});

// House Tile form routes
app.get("/house-tiles/new", async (c) => {
  const counts = await repository.getCounts();
  return c.html(
    <Layout title="New House Tile" sseEndpoint="/sse/house-tiles/new" counts={counts} />
  );
});

app.get("/sse/house-tiles/new", async (c) => {
  return streamSSE(c, async (stream) => {
    await stream.writeSSE(fragmentEvent(HouseTileForm({ isNew: true })));
  });
});

app.get("/house-tiles/:id", async (c) => {
  const counts = await repository.getCounts();
  const id = c.req.param("id");
  return c.html(
    <Layout title="Edit House Tile" sseEndpoint={`/sse/house-tiles/${id}`} counts={counts} />
  );
});

app.get("/sse/house-tiles/:id", async (c) => {
  const id = c.req.param("id");
  return streamSSE(c, async (stream) => {
    const houseTile = await repository.houseTiles.getById(id);
    if (houseTile) {
      await stream.writeSSE(fragmentEvent(HouseTileForm({ houseTile, isNew: false })));
    } else {
      await stream.writeSSE(fragmentEvent(
        <div id="main-content" class="text-center py-12">
          <h1 class="text-2xl font-bold text-red-400">House Tile not found</h1>
          <a href="/house-tiles" class="text-blue-400 hover:underline mt-4 inline-block">
            ← Back to House Tiles
          </a>
        </div>
      ));
    }
  });
});

// NPCs routes
app.get("/npcs", async (c) => {
  const counts = await repository.getCounts();
  return c.html(
    <Layout title="NPCs" sseEndpoint="/sse/npcs" counts={counts} />
  );
});

app.get("/sse/npcs", async (c) => {
  return streamSSE(c, async (stream) => {
    const npcs = await repository.npcs.getAll();
    await stream.writeSSE(fragmentEvent(NPCsList({ npcs })));

    const handleUpdate = async () => {
      const npcs = await repository.npcs.getAll();
      await stream.writeSSE(fragmentEvent(NPCsList({ npcs })));
    };

    PubSub.subscribe(NPCS_UPDATED, handleUpdate);
    stream.onAbort(() => PubSub.off(NPCS_UPDATED, handleUpdate));
  });
});

// NPC form routes
app.get("/npcs/new", async (c) => {
  const counts = await repository.getCounts();
  return c.html(
    <Layout title="New NPC" sseEndpoint="/sse/npcs/new" counts={counts} />
  );
});

app.get("/sse/npcs/new", async (c) => {
  return streamSSE(c, async (stream) => {
    const allNpcs = await repository.npcs.getAll();
    await stream.writeSSE(fragmentEvent(NPCForm({ isNew: true, allNpcs })));
  });
});

app.get("/npcs/:id", async (c) => {
  const counts = await repository.getCounts();
  const id = c.req.param("id");
  return c.html(
    <Layout title="Edit NPC" sseEndpoint={`/sse/npcs/${id}`} counts={counts} />
  );
});

app.get("/sse/npcs/:id", async (c) => {
  const id = c.req.param("id");
  return streamSSE(c, async (stream) => {
    const npc = await repository.npcs.getById(id);
    const allNpcs = await repository.npcs.getAll();
    if (npc) {
      await stream.writeSSE(fragmentEvent(NPCForm({ npc, isNew: false, allNpcs })));
    } else {
      await stream.writeSSE(fragmentEvent(
        <div id="main-content" class="text-center py-12">
          <h1 class="text-2xl font-bold text-red-400">NPC not found</h1>
          <a href="/npcs" class="text-blue-400 hover:underline mt-4 inline-block">
            ← Back to NPCs
          </a>
        </div>
      ));
    }
  });
});

// Quests routes
app.get("/quests", async (c) => {
  const counts = await repository.getCounts();
  return c.html(
    <Layout title="Quests" sseEndpoint="/sse/quests" counts={counts} />
  );
});

app.get("/sse/quests", async (c) => {
  return streamSSE(c, async (stream) => {
    const quests = await repository.quests.getAll();
    await stream.writeSSE(fragmentEvent(QuestsList({ quests })));

    const handleUpdate = async () => {
      const quests = await repository.quests.getAll();
      await stream.writeSSE(fragmentEvent(QuestsList({ quests })));
    };

    PubSub.subscribe(QUESTS_UPDATED, handleUpdate);
    stream.onAbort(() => PubSub.off(QUESTS_UPDATED, handleUpdate));
  });
});

// Quest form routes
app.get("/quests/new", async (c) => {
  const counts = await repository.getCounts();
  return c.html(
    <Layout title="New Quest" sseEndpoint="/sse/quests/new" counts={counts} />
  );
});

app.get("/sse/quests/new", async (c) => {
  return streamSSE(c, async (stream) => {
    const npcs = await repository.npcs.getAll();
    const allQuests = await repository.quests.getAll();
    await stream.writeSSE(fragmentEvent(QuestForm({ isNew: true, npcs, allQuests })));
  });
});

app.get("/quests/:id", async (c) => {
  const counts = await repository.getCounts();
  const id = c.req.param("id");
  return c.html(
    <Layout title="Edit Quest" sseEndpoint={`/sse/quests/${id}`} counts={counts} />
  );
});

app.get("/sse/quests/:id", async (c) => {
  const id = c.req.param("id");
  return streamSSE(c, async (stream) => {
    const quest = await repository.quests.getById(id);
    const npcs = await repository.npcs.getAll();
    const allQuests = await repository.quests.getAll();
    if (quest) {
      await stream.writeSSE(fragmentEvent(QuestForm({ quest, isNew: false, npcs, allQuests })));
    } else {
      await stream.writeSSE(fragmentEvent(
        <div id="main-content" class="text-center py-12">
          <h1 class="text-2xl font-bold text-red-400">Quest not found</h1>
          <a href="/quests" class="text-blue-400 hover:underline mt-4 inline-block">
            ← Back to Quests
          </a>
        </div>
      ));
    }
  });
});

// Graph routes
app.get("/graph", async (c) => {
  const counts = await repository.getCounts();
  return c.html(
    <Layout title="Graph" sseEndpoint="/sse/graph" counts={counts} />
  );
});

app.get("/sse/graph", async (c) => {
  return streamSSE(c, async (stream) => {
    const graphData = await buildGraphData();
    await stream.writeSSE(fragmentEvent(GraphView({ graphData })));

    const handleUpdate = async () => {
      const graphData = await buildGraphData();
      await stream.writeSSE(fragmentEvent(GraphView({ graphData })));
    };

    PubSub.subscribe(ITEMS_UPDATED, handleUpdate);
    PubSub.subscribe(RESOURCES_UPDATED, handleUpdate);
    PubSub.subscribe(TILES_UPDATED, handleUpdate);
    PubSub.subscribe(NPCS_UPDATED, handleUpdate);
    PubSub.subscribe(QUESTS_UPDATED, handleUpdate);
    PubSub.subscribe(HOUSE_TILES_UPDATED, handleUpdate);

    stream.onAbort(() => {
      PubSub.off(ITEMS_UPDATED, handleUpdate);
      PubSub.off(RESOURCES_UPDATED, handleUpdate);
      PubSub.off(TILES_UPDATED, handleUpdate);
      PubSub.off(NPCS_UPDATED, handleUpdate);
      PubSub.off(QUESTS_UPDATED, handleUpdate);
      PubSub.off(HOUSE_TILES_UPDATED, handleUpdate);
    });
  });
});

app.get("/validate", async (c) => {
  const counts = await repository.getCounts();
  return c.html(
    <Layout title="Validate" sseEndpoint="/sse/validate" counts={counts} />
  );
});

app.get("/sse/validate", async (c) => {
  return streamSSE(c, async (stream) => {
    const validation = await runValidation();
    await stream.writeSSE(fragmentEvent(ValidationView({ validation })));

    const handleUpdate = async () => {
      const validation = await runValidation();
      await stream.writeSSE(fragmentEvent(ValidationView({ validation })));
    };

    PubSub.subscribe(ITEMS_UPDATED, handleUpdate);
    PubSub.subscribe(RESOURCES_UPDATED, handleUpdate);
    PubSub.subscribe(TILES_UPDATED, handleUpdate);
    PubSub.subscribe(NPCS_UPDATED, handleUpdate);
    PubSub.subscribe(QUESTS_UPDATED, handleUpdate);
    PubSub.subscribe(HOUSE_TILES_UPDATED, handleUpdate);

    stream.onAbort(() => {
      PubSub.off(ITEMS_UPDATED, handleUpdate);
      PubSub.off(RESOURCES_UPDATED, handleUpdate);
      PubSub.off(TILES_UPDATED, handleUpdate);
      PubSub.off(NPCS_UPDATED, handleUpdate);
      PubSub.off(QUESTS_UPDATED, handleUpdate);
      PubSub.off(HOUSE_TILES_UPDATED, handleUpdate);
    });
  });
});

// World Bible routes
app.get("/world", async (c) => {
  const counts = await repository.getCounts();
  return c.html(
    <Layout title="World Bible" sseEndpoint="/sse/world" counts={counts} />
  );
});

app.get("/sse/world", async (c) => {
  return streamSSE(c, async (stream) => {
    const worldBible = await repository.worldBible.get();
    await stream.writeSSE(fragmentEvent(WorldOverview({ worldBible })));
  });
});

app.get("/world/setting", async (c) => {
  const counts = await repository.getCounts();
  return c.html(
    <Layout title="World Setting" sseEndpoint="/sse/world/setting" counts={counts} />
  );
});

app.get("/sse/world/setting", async (c) => {
  return streamSSE(c, async (stream) => {
    const worldBible = await repository.worldBible.get();
    await stream.writeSSE(fragmentEvent(WorldSettingForm({ setting: worldBible.setting, worldName: worldBible.name })));
  });
});

app.get("/world/regions", async (c) => {
  const counts = await repository.getCounts();
  return c.html(
    <Layout title="Regions" sseEndpoint="/sse/world/regions" counts={counts} />
  );
});

app.get("/sse/world/regions", async (c) => {
  return streamSSE(c, async (stream) => {
    const worldBible = await repository.worldBible.get();
    await stream.writeSSE(fragmentEvent(WorldRegionsList({ regions: worldBible.regions })));
  });
});

app.get("/world/regions/new", async (c) => {
  const counts = await repository.getCounts();
  return c.html(
    <Layout title="New Region" sseEndpoint="/sse/world/regions/new" counts={counts} />
  );
});

app.get("/sse/world/regions/new", async (c) => {
  return streamSSE(c, async (stream) => {
    await stream.writeSSE(fragmentEvent(WorldRegionForm({ isNew: true })));
  });
});

app.get("/world/regions/:id", async (c) => {
  const counts = await repository.getCounts();
  const id = c.req.param("id");
  return c.html(
    <Layout title="Edit Region" sseEndpoint={`/sse/world/regions/${id}`} counts={counts} />
  );
});

app.get("/sse/world/regions/:id", async (c) => {
  const id = c.req.param("id");
  return streamSSE(c, async (stream) => {
    const worldBible = await repository.worldBible.get();
    const region = worldBible.regions.find((r: WorldRegion) => r.id === id);
    if (region) {
      await stream.writeSSE(fragmentEvent(WorldRegionForm({ region, isNew: false })));
    } else {
      await stream.writeSSE(fragmentEvent(
        <div id="main-content" class="text-center py-12">
          <h1 class="text-2xl font-bold text-red-400">Region not found</h1>
          <a href="/world/regions" class="text-blue-400 hover:underline mt-4 inline-block">
            ← Back to Regions
          </a>
        </div>
      ));
    }
  });
});

app.get("/world/factions", async (c) => {
  const counts = await repository.getCounts();
  return c.html(
    <Layout title="Factions" sseEndpoint="/sse/world/factions" counts={counts} />
  );
});

app.get("/sse/world/factions", async (c) => {
  return streamSSE(c, async (stream) => {
    const worldBible = await repository.worldBible.get();
    await stream.writeSSE(fragmentEvent(WorldFactionsList({ factions: worldBible.factions })));
  });
});

app.get("/world/factions/new", async (c) => {
  const counts = await repository.getCounts();
  return c.html(
    <Layout title="New Faction" sseEndpoint="/sse/world/factions/new" counts={counts} />
  );
});

app.get("/sse/world/factions/new", async (c) => {
  return streamSSE(c, async (stream) => {
    const worldBible = await repository.worldBible.get();
    await stream.writeSSE(fragmentEvent(WorldFactionForm({ isNew: true, allFactions: worldBible.factions })));
  });
});

app.get("/world/factions/:id", async (c) => {
  const counts = await repository.getCounts();
  const id = c.req.param("id");
  return c.html(
    <Layout title="Edit Faction" sseEndpoint={`/sse/world/factions/${id}`} counts={counts} />
  );
});

app.get("/sse/world/factions/:id", async (c) => {
  const id = c.req.param("id");
  return streamSSE(c, async (stream) => {
    const worldBible = await repository.worldBible.get();
    const faction = worldBible.factions.find((f: WorldFaction) => f.id === id);
    if (faction) {
      await stream.writeSSE(fragmentEvent(WorldFactionForm({ faction, isNew: false, allFactions: worldBible.factions })));
    } else {
      await stream.writeSSE(fragmentEvent(
        <div id="main-content" class="text-center py-12">
          <h1 class="text-2xl font-bold text-red-400">Faction not found</h1>
          <a href="/world/factions" class="text-blue-400 hover:underline mt-4 inline-block">
            ← Back to Factions
          </a>
        </div>
      ));
    }
  });
});

// History routes
app.get("/world/history", async (c) => {
  const counts = await repository.getCounts();
  return c.html(
    <Layout title="History" sseEndpoint="/sse/world/history" counts={counts} />
  );
});

app.get("/sse/world/history", async (c) => {
  return streamSSE(c, async (stream) => {
    const worldBible = await repository.worldBible.get();
    await stream.writeSSE(fragmentEvent(WorldHistoryList({ history: worldBible.history })));
  });
});

app.get("/world/history/new", async (c) => {
  const counts = await repository.getCounts();
  return c.html(
    <Layout title="New Event" sseEndpoint="/sse/world/history/new" counts={counts} />
  );
});

app.get("/sse/world/history/new", async (c) => {
  return streamSSE(c, async (stream) => {
    await stream.writeSSE(fragmentEvent(WorldHistoryForm({ isNew: true })));
  });
});

app.get("/world/history/:id", async (c) => {
  const counts = await repository.getCounts();
  const id = c.req.param("id");
  return c.html(
    <Layout title="Edit Event" sseEndpoint={`/sse/world/history/${id}`} counts={counts} />
  );
});

app.get("/sse/world/history/:id", async (c) => {
  const id = c.req.param("id");
  return streamSSE(c, async (stream) => {
    const worldBible = await repository.worldBible.get();
    const event = worldBible.history.find((h: WorldHistoryEvent) => h.id === id);
    if (event) {
      await stream.writeSSE(fragmentEvent(WorldHistoryForm({ event, isNew: false })));
    } else {
      await stream.writeSSE(fragmentEvent(
        <div id="main-content" class="text-center py-12">
          <h1 class="text-2xl font-bold text-red-400">Event not found</h1>
          <a href="/world/history" class="text-blue-400 hover:underline mt-4 inline-block">
            ← Back to History
          </a>
        </div>
      ));
    }
  });
});

// Themes routes
app.get("/world/themes", async (c) => {
  const counts = await repository.getCounts();
  return c.html(
    <Layout title="Themes" sseEndpoint="/sse/world/themes" counts={counts} />
  );
});

app.get("/sse/world/themes", async (c) => {
  return streamSSE(c, async (stream) => {
    const worldBible = await repository.worldBible.get();
    await stream.writeSSE(fragmentEvent(WorldThemesList({ themes: worldBible.themes })));
  });
});

app.get("/world/themes/new", async (c) => {
  const counts = await repository.getCounts();
  return c.html(
    <Layout title="New Theme" sseEndpoint="/sse/world/themes/new" counts={counts} />
  );
});

app.get("/sse/world/themes/new", async (c) => {
  return streamSSE(c, async (stream) => {
    await stream.writeSSE(fragmentEvent(WorldThemeForm({ isNew: true })));
  });
});

app.get("/world/themes/:id", async (c) => {
  const counts = await repository.getCounts();
  const id = c.req.param("id");
  return c.html(
    <Layout title="Edit Theme" sseEndpoint={`/sse/world/themes/${id}`} counts={counts} />
  );
});

app.get("/sse/world/themes/:id", async (c) => {
  const id = c.req.param("id");
  return streamSSE(c, async (stream) => {
    const worldBible = await repository.worldBible.get();
    const theme = worldBible.themes.find((t: WorldTheme) => t.id === id);
    if (theme) {
      await stream.writeSSE(fragmentEvent(WorldThemeForm({ theme, isNew: false })));
    } else {
      await stream.writeSSE(fragmentEvent(
        <div id="main-content" class="text-center py-12">
          <h1 class="text-2xl font-bold text-red-400">Theme not found</h1>
          <a href="/world/themes" class="text-blue-400 hover:underline mt-4 inline-block">
            ← Back to Themes
          </a>
        </div>
      ));
    }
  });
});

// Systems routes
app.get("/world/systems", async (c) => {
  const counts = await repository.getCounts();
  return c.html(
    <Layout title="Systems" sseEndpoint="/sse/world/systems" counts={counts} />
  );
});

app.get("/sse/world/systems", async (c) => {
  return streamSSE(c, async (stream) => {
    const worldBible = await repository.worldBible.get();
    await stream.writeSSE(fragmentEvent(WorldSystemsList({ systems: worldBible.systems })));
  });
});

app.get("/world/systems/new", async (c) => {
  const counts = await repository.getCounts();
  return c.html(
    <Layout title="New System" sseEndpoint="/sse/world/systems/new" counts={counts} />
  );
});

app.get("/sse/world/systems/new", async (c) => {
  return streamSSE(c, async (stream) => {
    await stream.writeSSE(fragmentEvent(WorldSystemForm({ isNew: true })));
  });
});

app.get("/world/systems/:id", async (c) => {
  const counts = await repository.getCounts();
  const id = c.req.param("id");
  return c.html(
    <Layout title="Edit System" sseEndpoint={`/sse/world/systems/${id}`} counts={counts} />
  );
});

app.get("/sse/world/systems/:id", async (c) => {
  const id = c.req.param("id");
  return streamSSE(c, async (stream) => {
    const worldBible = await repository.worldBible.get();
    const system = worldBible.systems.find((s: WorldSystem) => s.id === id);
    if (system) {
      await stream.writeSSE(fragmentEvent(WorldSystemForm({ system, isNew: false })));
    } else {
      await stream.writeSSE(fragmentEvent(
        <div id="main-content" class="text-center py-12">
          <h1 class="text-2xl font-bold text-red-400">System not found</h1>
          <a href="/world/systems" class="text-blue-400 hover:underline mt-4 inline-block">
            ← Back to Systems
          </a>
        </div>
      ));
    }
  });
});

// Naming routes
app.get("/world/naming", async (c) => {
  const counts = await repository.getCounts();
  return c.html(
    <Layout title="Naming Conventions" sseEndpoint="/sse/world/naming" counts={counts} />
  );
});

app.get("/sse/world/naming", async (c) => {
  return streamSSE(c, async (stream) => {
    const worldBible = await repository.worldBible.get();
    await stream.writeSSE(fragmentEvent(WorldNamingForm({ naming: worldBible.naming })));
  });
});

// AI Generation routes
app.get("/ai", async (c) => {
  const counts = await repository.getCounts();
  return c.html(
    <Layout title="AI Generation" sseEndpoint="/sse/ai" counts={counts} />
  );
});

app.get("/sse/ai", async (c) => {
  return streamSSE(c, async (stream) => {
    const worldBible = await repository.worldBible.get();
    await stream.writeSSE(fragmentEvent(AIGenerationView({ worldBible })));
  });
});

app.get("/export", async (c) => {
  const counts = await repository.getCounts();
  return c.html(
    <Layout title="Export" sseEndpoint="/sse/export" counts={counts} />
  );
});

// Impact Analysis routes
app.get("/impact/:type/:id", async (c) => {
  const counts = await repository.getCounts();
  const type = c.req.param("type") as EntityType;
  const id = c.req.param("id");
  return c.html(
    <Layout title="Impact Analysis" sseEndpoint={`/sse/impact/${type}/${id}`} counts={counts} />
  );
});

app.get("/sse/impact/:type/:id", async (c) => {
  const type = c.req.param("type") as EntityType;
  const id = c.req.param("id");
  return streamSSE(c, async (stream) => {
    const analysis = await analyzeImpact(type, id);
    if (analysis) {
      await stream.writeSSE(fragmentEvent(ImpactView({ analysis })));
    } else {
      await stream.writeSSE(fragmentEvent(
        <div id="main-content" class="text-center py-12">
          <h1 class="text-2xl font-bold text-red-400">Entity not found</h1>
          <a href="/" class="text-blue-400 hover:underline mt-4 inline-block">
            ← Back to Dashboard
          </a>
        </div>
      ));
    }
  });
});

app.get("/sse/export", async (c) => {
  return streamSSE(c, async (stream) => {
    const [jsonExport, tsExport] = await Promise.all([
      exportToJson(),
      exportToTypeScript(),
    ]);
    await stream.writeSSE(fragmentEvent(ExportView({ jsonExport, tsExport })));
  });
});

// Command routes (POST endpoints that return 204)

// Create new item
app.post("/commands/items", async (c) => {
  const body = await c.req.parseBody();
  const item = {
    id: body.id as string,
    name: body.name as string,
    description: body.description as string,
    type: body.type as "resource" | "tool" | "weapon" | "armor" | "consumable" | "quest" | "item",
    rarity: body.rarity as "common" | "uncommon" | "rare" | "epic" | "legendary",
    stackable: body.stackable === "on",
    maxStackSize: parseInt(body.maxStackSize as string) || 1,
    equippable: body.equippable === "on",
    equipSlot: (body.equipSlot as EquipSlot) || undefined,
    durability: parseItemDurability(body),
    attributes: parseItemAttributes(body),
    requirements: parseItemRequirements(body),
    effects: parseItemEffects(body).length > 0 ? parseItemEffects(body) : undefined,
    value: parseInt(body.value as string) || 0,
    weight: parseFloat(body.weight as string) || 0,
  };
  await repository.items.create(item);
  PubSub.publish(ITEMS_UPDATED, { id: item.id });
  return c.redirect("/items");
});

// Update existing item
app.post("/commands/items/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.parseBody();
  const updates = {
    name: body.name as string,
    description: body.description as string,
    type: body.type as "resource" | "tool" | "weapon" | "armor" | "consumable" | "quest" | "item",
    rarity: body.rarity as "common" | "uncommon" | "rare" | "epic" | "legendary",
    stackable: body.stackable === "on",
    maxStackSize: parseInt(body.maxStackSize as string) || 1,
    equippable: body.equippable === "on",
    equipSlot: (body.equipSlot as EquipSlot) || undefined,
    durability: parseItemDurability(body),
    attributes: parseItemAttributes(body),
    requirements: parseItemRequirements(body),
    effects: parseItemEffects(body).length > 0 ? parseItemEffects(body) : undefined,
    value: parseInt(body.value as string) || 0,
    weight: parseFloat(body.weight as string) || 0,
  };
  await repository.items.update(id, updates);
  PubSub.publish(ITEMS_UPDATED, { id });
  return c.redirect("/items");
});

app.post("/commands/items/:id/delete", async (c) => {
  const id = c.req.param("id");
  await repository.items.delete(id);
  PubSub.publish(ITEMS_UPDATED, { id });
  return c.redirect("/items");
});

// Create new resource
app.post("/commands/resources", async (c) => {
  const body = await c.req.parseBody();
  const resource = {
    id: body.id as string,
    name: body.name as string,
    amount: parseInt(body.amount as string) || 1,
    limitless: body.limitless === "on",
    reward_items: parseItemQuantityList(body, "reward_items"),
    required_items: parseRequiredItemList(body, "required_items"),
    collectionTime: parseInt(body.collectionTime as string) || 5,
    type: body.type as "resource" | "workbench" | "furnace" | "magic",
    verb: body.verb as string || "Collect",
  };
  await repository.resources.create(resource);
  PubSub.publish(RESOURCES_UPDATED, { id: resource.id });
  return c.redirect("/resources");
});

// Update existing resource
app.post("/commands/resources/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.parseBody();
  const updates = {
    name: body.name as string,
    amount: parseInt(body.amount as string) || 1,
    limitless: body.limitless === "on",
    reward_items: parseItemQuantityList(body, "reward_items"),
    required_items: parseRequiredItemList(body, "required_items"),
    collectionTime: parseInt(body.collectionTime as string) || 5,
    type: body.type as "resource" | "workbench" | "furnace" | "magic",
    verb: body.verb as string || "Collect",
  };
  await repository.resources.update(id, updates);
  PubSub.publish(RESOURCES_UPDATED, { id });
  return c.redirect("/resources");
});

app.post("/commands/resources/:id/delete", async (c) => {
  const id = c.req.param("id");
  await repository.resources.delete(id);
  PubSub.publish(RESOURCES_UPDATED, { id });
  return c.redirect("/resources");
});

// Create new tile
app.post("/commands/tiles", async (c) => {
  const body = await c.req.parseBody();
  const tile = {
    id: body.id as string,
    name: body.name as string,
    color: body.color as string,
    backgroundColor: body.backgroundColor as string,
    theme: body.theme as string,
    texture: body.texture as string,
    resources: parseStringArray(body, "resources"),
    rarity: parseFloat(body.rarity as string) || 0.5,
    accessible: body.accessible === "on",
  };
  await repository.tiles.create(tile);
  PubSub.publish(TILES_UPDATED, { id: tile.id });
  return c.redirect("/tiles");
});

// Update existing tile
app.post("/commands/tiles/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.parseBody();
  const updates = {
    name: body.name as string,
    color: body.color as string,
    backgroundColor: body.backgroundColor as string,
    theme: body.theme as string,
    texture: body.texture as string,
    resources: parseStringArray(body, "resources"),
    rarity: parseFloat(body.rarity as string) || 0.5,
    accessible: body.accessible === "on",
  };
  await repository.tiles.update(id, updates);
  PubSub.publish(TILES_UPDATED, { id });
  return c.redirect("/tiles");
});

app.post("/commands/tiles/:id/delete", async (c) => {
  const id = c.req.param("id");
  await repository.tiles.delete(id);
  PubSub.publish(TILES_UPDATED, { id });
  return c.redirect("/tiles");
});

// Create new NPC
app.post("/commands/npcs", async (c) => {
  const body = await c.req.parseBody();
  const npc = {
    entity_id: body.entity_id as string,
    name: body.name as string,
    backstory: body.backstory as string,
    personalMission: body.personalMission as string,
    hopes: body.hopes as string,
    fears: body.fears as string,
    relationships: parseRelationships(body),
  };
  await repository.npcs.create(npc);
  PubSub.publish(NPCS_UPDATED, { id: npc.entity_id });
  return c.redirect("/npcs");
});

// Update existing NPC
app.post("/commands/npcs/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.parseBody();
  const updates = {
    name: body.name as string,
    backstory: body.backstory as string,
    personalMission: body.personalMission as string,
    hopes: body.hopes as string,
    fears: body.fears as string,
    relationships: parseRelationships(body),
  };
  await repository.npcs.update(id, updates);
  PubSub.publish(NPCS_UPDATED, { id });
  return c.redirect("/npcs");
});

app.post("/commands/npcs/:id/delete", async (c) => {
  const id = c.req.param("id");
  await repository.npcs.delete(id);
  PubSub.publish(NPCS_UPDATED, { id });
  return c.redirect("/npcs");
});

// Create new quest
app.post("/commands/quests", async (c) => {
  const body = await c.req.parseBody();
  const quest = {
    id: body.id as string,
    name: body.name as string,
    description: body.description as string,
    type: body.type as QuestType,
    giver: {
      entity_id: body.giver_entity_id as string,
      zone_id: (body.giver_zone_id as string) || "",
      x: parseInt(body.giver_x as string) || 0,
      y: parseInt(body.giver_y as string) || 0,
    },
    objectives: parseObjectives(body),
    completion: parseCompletion(body),
    rewards: parseRewards(body),
    is_tutorial: body.is_tutorial === "on",
    prerequisites: parseStringArray(body, "prerequisites"),
    starts_at: 0,
    ends_at: 0,
  };
  await repository.quests.create(quest);
  PubSub.publish(QUESTS_UPDATED, { id: quest.id });
  return c.redirect("/quests");
});

// Update existing quest
app.post("/commands/quests/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.parseBody();
  const updates = {
    name: body.name as string,
    description: body.description as string,
    type: body.type as QuestType,
    giver: {
      entity_id: body.giver_entity_id as string,
      zone_id: (body.giver_zone_id as string) || "",
      x: parseInt(body.giver_x as string) || 0,
      y: parseInt(body.giver_y as string) || 0,
    },
    objectives: parseObjectives(body),
    completion: parseCompletion(body),
    rewards: parseRewards(body),
    is_tutorial: body.is_tutorial === "on",
    prerequisites: parseStringArray(body, "prerequisites"),
  };
  await repository.quests.update(id, updates);
  PubSub.publish(QUESTS_UPDATED, { id });
  return c.redirect("/quests");
});

app.post("/commands/quests/:id/delete", async (c) => {
  const id = c.req.param("id");
  await repository.quests.delete(id);
  PubSub.publish(QUESTS_UPDATED, { id });
  return c.redirect("/quests");
});

// Create new house tile
app.post("/commands/house-tiles", async (c) => {
  const body = await c.req.parseBody();
  const houseTile = {
    id: body.id as string,
    name: body.name as string,
    description: body.description as string,
    sprite: body.sprite as string || "🏠",
    bgColor: body.bgColor as string || "#374151",
    availableActions: JSON.parse((body.availableActions as string) || "[]"),
    flags: JSON.parse((body.flags as string) || "{}"),
  };
  await repository.houseTiles.create(houseTile);
  PubSub.publish(HOUSE_TILES_UPDATED, { id: houseTile.id });
  return c.redirect("/house-tiles");
});

// Update existing house tile
app.post("/commands/house-tiles/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.parseBody();
  const updates = {
    name: body.name as string,
    description: body.description as string,
    sprite: body.sprite as string || "🏠",
    bgColor: body.bgColor as string || "#374151",
    availableActions: JSON.parse((body.availableActions as string) || "[]"),
    flags: JSON.parse((body.flags as string) || "{}"),
  };
  await repository.houseTiles.update(id, updates);
  PubSub.publish(HOUSE_TILES_UPDATED, { id });
  return c.redirect("/house-tiles");
});

app.post("/commands/house-tiles/:id/delete", async (c) => {
  const id = c.req.param("id");
  await repository.houseTiles.delete(id);
  PubSub.publish(HOUSE_TILES_UPDATED, { id });
  return c.redirect("/house-tiles");
});

// World Bible commands
app.post("/commands/world/setting", async (c) => {
  const body = await c.req.parseBody();
  const worldBible = await repository.worldBible.get();
  worldBible.name = body.name as string;
  worldBible.setting = {
    genre: body.genre as string,
    tone: body.tone as string,
    era: body.era as string,
    description: body.description as string,
  };
  await repository.worldBible.save(worldBible);
  return c.redirect("/world");
});

app.post("/commands/world/regions", async (c) => {
  const body = await c.req.parseBody();
  const worldBible = await repository.worldBible.get();
  const region: WorldRegion = {
    id: body.id as string,
    name: body.name as string,
    description: body.description as string,
    climate: body.climate as string,
    themes: (body.themes as string).split(",").map((s) => s.trim()).filter(Boolean),
    inhabitants: (body.inhabitants as string).split(",").map((s) => s.trim()).filter(Boolean),
    resources: (body.resources as string).split(",").map((s) => s.trim()).filter(Boolean),
  };
  worldBible.regions.push(region);
  await repository.worldBible.save(worldBible);
  return c.redirect("/world/regions");
});

app.post("/commands/world/regions/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.parseBody();
  const worldBible = await repository.worldBible.get();
  const index = worldBible.regions.findIndex((r: WorldRegion) => r.id === id);
  if (index !== -1) {
    worldBible.regions[index] = {
      id,
      name: body.name as string,
      description: body.description as string,
      climate: body.climate as string,
      themes: (body.themes as string).split(",").map((s) => s.trim()).filter(Boolean),
      inhabitants: (body.inhabitants as string).split(",").map((s) => s.trim()).filter(Boolean),
      resources: (body.resources as string).split(",").map((s) => s.trim()).filter(Boolean),
    };
    await repository.worldBible.save(worldBible);
  }
  return c.redirect("/world/regions");
});

app.post("/commands/world/regions/:id/delete", async (c) => {
  const id = c.req.param("id");
  const worldBible = await repository.worldBible.get();
  worldBible.regions = worldBible.regions.filter((r: WorldRegion) => r.id !== id);
  await repository.worldBible.save(worldBible);
  return c.redirect("/world/regions");
});

app.post("/commands/world/factions", async (c) => {
  const body = await c.req.parseBody();
  const worldBible = await repository.worldBible.get();
  const faction: WorldFaction = {
    id: body.id as string,
    name: body.name as string,
    description: body.description as string,
    alignment: body.alignment as "friendly" | "neutral" | "hostile",
    goals: (body.goals as string).split("\n").map((s) => s.trim()).filter(Boolean),
    allies: (body.allies as string).split(",").map((s) => s.trim()).filter(Boolean),
    rivals: (body.rivals as string).split(",").map((s) => s.trim()).filter(Boolean),
    members: (body.members as string).split(",").map((s) => s.trim()).filter(Boolean),
  };
  worldBible.factions.push(faction);
  await repository.worldBible.save(worldBible);
  return c.redirect("/world/factions");
});

app.post("/commands/world/factions/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.parseBody();
  const worldBible = await repository.worldBible.get();
  const index = worldBible.factions.findIndex((f: WorldFaction) => f.id === id);
  if (index !== -1) {
    worldBible.factions[index] = {
      id,
      name: body.name as string,
      description: body.description as string,
      alignment: body.alignment as "friendly" | "neutral" | "hostile",
      goals: (body.goals as string).split("\n").map((s) => s.trim()).filter(Boolean),
      allies: (body.allies as string).split(",").map((s) => s.trim()).filter(Boolean),
      rivals: (body.rivals as string).split(",").map((s) => s.trim()).filter(Boolean),
      members: (body.members as string).split(",").map((s) => s.trim()).filter(Boolean),
    };
    await repository.worldBible.save(worldBible);
  }
  return c.redirect("/world/factions");
});

app.post("/commands/world/factions/:id/delete", async (c) => {
  const id = c.req.param("id");
  const worldBible = await repository.worldBible.get();
  worldBible.factions = worldBible.factions.filter((f: WorldFaction) => f.id !== id);
  await repository.worldBible.save(worldBible);
  return c.redirect("/world/factions");
});

// History commands
app.post("/commands/world/history", async (c) => {
  const body = await c.req.parseBody();
  const worldBible = await repository.worldBible.get();
  const event: WorldHistoryEvent = {
    id: body.id as string,
    name: body.name as string,
    description: body.description as string,
    era: body.era as string,
    significance: body.significance as string,
    relatedEntities: (body.relatedEntities as string).split(",").map((s) => s.trim()).filter(Boolean),
  };
  worldBible.history.push(event);
  await repository.worldBible.save(worldBible);
  return c.redirect("/world/history");
});

app.post("/commands/world/history/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.parseBody();
  const worldBible = await repository.worldBible.get();
  const index = worldBible.history.findIndex((h: WorldHistoryEvent) => h.id === id);
  if (index !== -1) {
    worldBible.history[index] = {
      id,
      name: body.name as string,
      description: body.description as string,
      era: body.era as string,
      significance: body.significance as string,
      relatedEntities: (body.relatedEntities as string).split(",").map((s) => s.trim()).filter(Boolean),
    };
    await repository.worldBible.save(worldBible);
  }
  return c.redirect("/world/history");
});

app.post("/commands/world/history/:id/delete", async (c) => {
  const id = c.req.param("id");
  const worldBible = await repository.worldBible.get();
  worldBible.history = worldBible.history.filter((h: WorldHistoryEvent) => h.id !== id);
  await repository.worldBible.save(worldBible);
  return c.redirect("/world/history");
});

// Themes commands
app.post("/commands/world/themes", async (c) => {
  const body = await c.req.parseBody();
  const worldBible = await repository.worldBible.get();
  const theme: WorldTheme = {
    id: body.id as string,
    name: body.name as string,
    description: body.description as string,
    examples: (body.examples as string).split("\n").map((s) => s.trim()).filter(Boolean),
  };
  worldBible.themes.push(theme);
  await repository.worldBible.save(worldBible);
  return c.redirect("/world/themes");
});

app.post("/commands/world/themes/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.parseBody();
  const worldBible = await repository.worldBible.get();
  const index = worldBible.themes.findIndex((t: WorldTheme) => t.id === id);
  if (index !== -1) {
    worldBible.themes[index] = {
      id,
      name: body.name as string,
      description: body.description as string,
      examples: (body.examples as string).split("\n").map((s) => s.trim()).filter(Boolean),
    };
    await repository.worldBible.save(worldBible);
  }
  return c.redirect("/world/themes");
});

app.post("/commands/world/themes/:id/delete", async (c) => {
  const id = c.req.param("id");
  const worldBible = await repository.worldBible.get();
  worldBible.themes = worldBible.themes.filter((t: WorldTheme) => t.id !== id);
  await repository.worldBible.save(worldBible);
  return c.redirect("/world/themes");
});

// Systems commands
app.post("/commands/world/systems", async (c) => {
  const body = await c.req.parseBody();
  const worldBible = await repository.worldBible.get();
  const system: WorldSystem = {
    id: body.id as string,
    name: body.name as string,
    type: body.type as "magic" | "technology" | "hybrid",
    description: body.description as string,
    rules: (body.rules as string).split("\n").map((s) => s.trim()).filter(Boolean),
    limitations: (body.limitations as string).split("\n").map((s) => s.trim()).filter(Boolean),
  };
  worldBible.systems.push(system);
  await repository.worldBible.save(worldBible);
  return c.redirect("/world/systems");
});

app.post("/commands/world/systems/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.parseBody();
  const worldBible = await repository.worldBible.get();
  const index = worldBible.systems.findIndex((s: WorldSystem) => s.id === id);
  if (index !== -1) {
    worldBible.systems[index] = {
      id,
      name: body.name as string,
      type: body.type as "magic" | "technology" | "hybrid",
      description: body.description as string,
      rules: (body.rules as string).split("\n").map((s) => s.trim()).filter(Boolean),
      limitations: (body.limitations as string).split("\n").map((s) => s.trim()).filter(Boolean),
    };
    await repository.worldBible.save(worldBible);
  }
  return c.redirect("/world/systems");
});

app.post("/commands/world/systems/:id/delete", async (c) => {
  const id = c.req.param("id");
  const worldBible = await repository.worldBible.get();
  worldBible.systems = worldBible.systems.filter((s: WorldSystem) => s.id !== id);
  await repository.worldBible.save(worldBible);
  return c.redirect("/world/systems");
});

// Naming commands
app.post("/commands/world/naming", async (c) => {
  const body = await c.req.parseBody();
  const worldBible = await repository.worldBible.get();
  worldBible.naming = {
    characterPatterns: (body.characterPatterns as string).split("\n").map((s) => s.trim()).filter(Boolean),
    placePatterns: (body.placePatterns as string).split("\n").map((s) => s.trim()).filter(Boolean),
    itemPatterns: (body.itemPatterns as string).split("\n").map((s) => s.trim()).filter(Boolean),
    examples: {
      characters: (body.examples_characters as string || "").split(",").map((s) => s.trim()).filter(Boolean),
      places: (body.examples_places as string || "").split(",").map((s) => s.trim()).filter(Boolean),
      items: (body.examples_items as string || "").split(",").map((s) => s.trim()).filter(Boolean),
    },
  };
  await repository.worldBible.save(worldBible);
  return c.redirect("/world");
});

// Production server
if (process.env.NODE_ENV === "production") {
  const port = Number(process.env.PORT) || 3001;
  console.log(`Server running on http://localhost:${port}`);
  serve({
    fetch: app.fetch,
    port,
  });
}

export default app;
