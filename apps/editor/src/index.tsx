import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { streamSSE } from "hono/streaming";
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
    await stream.writeSSE(fragmentEvent(ResourceForm({ isNew: true })));
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
    const resource = await repository.resources.getById(id);
    if (resource) {
      await stream.writeSSE(fragmentEvent(ResourceForm({ resource, isNew: false })));
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
    await stream.writeSSE(fragmentEvent(TileForm({ isNew: true })));
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
    const tile = await repository.tiles.getById(id);
    if (tile) {
      await stream.writeSSE(fragmentEvent(TileForm({ tile, isNew: false })));
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
    await stream.writeSSE(fragmentEvent(QuestForm({ isNew: true, npcs })));
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
    if (quest) {
      await stream.writeSSE(fragmentEvent(QuestForm({ quest, isNew: false, npcs })));
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

app.get("/ai", async (c) => {
  const counts = await repository.getCounts();
  return c.html(
    <Layout title="AI Generation" counts={counts}>
      <h1 class="text-2xl font-bold text-white">🤖 AI Generation</h1>
      <p class="text-gray-400 mt-4">Coming soon...</p>
    </Layout>
  );
});

app.get("/export", async (c) => {
  const counts = await repository.getCounts();
  return c.html(
    <Layout title="Export" sseEndpoint="/sse/export" counts={counts} />
  );
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
    equipSlot: body.equipSlot as string || undefined,
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
    equipSlot: body.equipSlot as string || undefined,
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
    reward_items: JSON.parse((body.reward_items as string) || "[]"),
    required_items: JSON.parse((body.required_items as string) || "[]"),
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
    reward_items: JSON.parse((body.reward_items as string) || "[]"),
    required_items: JSON.parse((body.required_items as string) || "[]"),
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
    resources: JSON.parse((body.resources as string) || "[]"),
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
    resources: JSON.parse((body.resources as string) || "[]"),
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
    relationships: JSON.parse((body.relationships as string) || "{}"),
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
    relationships: JSON.parse((body.relationships as string) || "{}"),
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
    type: body.type as "collection" | "crafting" | "exploration" | "combat" | "delivery" | "dialog",
    giver: {
      entity_id: body.giver_entity_id as string,
      zone_id: body.giver_zone_id as string || undefined,
      x: parseInt(body.giver_x as string) || 0,
      y: parseInt(body.giver_y as string) || 0,
    },
    objectives: JSON.parse((body.objectives as string) || "[]"),
    completion: JSON.parse((body.completion as string) || "{}"),
    rewards: JSON.parse((body.rewards as string) || "[]"),
    is_tutorial: body.is_tutorial === "on",
    prerequisites: JSON.parse((body.prerequisites as string) || "[]"),
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
    type: body.type as "collection" | "crafting" | "exploration" | "combat" | "delivery" | "dialog",
    giver: {
      entity_id: body.giver_entity_id as string,
      zone_id: body.giver_zone_id as string || undefined,
      x: parseInt(body.giver_x as string) || 0,
      y: parseInt(body.giver_y as string) || 0,
    },
    objectives: JSON.parse((body.objectives as string) || "[]"),
    completion: JSON.parse((body.completion as string) || "{}"),
    rewards: JSON.parse((body.rewards as string) || "[]"),
    is_tutorial: body.is_tutorial === "on",
    prerequisites: JSON.parse((body.prerequisites as string) || "[]"),
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
