import { z } from "zod";
import { npcs, tileTypes, items, resources } from "../config.js";
import { manifest } from "./design-doc.js";
import { anthropic } from "../lib/anthropic.js";
import { zodToJsonSchema } from "zod-to-json-schema";

export const ItemSchema = z.object({
  id: z.string().describe("Unique identifier for the item"),
  name: z.string().describe("Name of the item"),
  description: z.string().describe("Description of the item"),
  type: z
    .string()
    .describe("Type of the item (e.g., weapon, armor, consumable)"),
  rarity: z
    .string()
    .describe("Rarity of the item (e.g., common, rare, legendary)"),
  stackable: z
    .boolean()
    .describe("Whether the item can be stacked in inventory"),
  maxStackSize: z.number().describe("Maximum number of items in a stack"),
  equippable: z.boolean().describe("Whether the item can be equipped"),
  equipSlot: z
    .string()
    .optional()
    .describe("Slot where the item can be equipped (if equippable)"),
  durability: z
    .object({
      current: z.number().describe("Current durability of the item"),
      max: z.number().describe("Maximum durability of the item"),
    })
    .optional()
    .describe("Durability information for the item"),
  attributes: z
    .object({
      damage: z.number().optional().describe("Damage dealt by the item"),
      armor: z.number().optional().describe("Armor provided by the item"),
      health: z
        .number()
        .optional()
        .describe("Health bonus provided by the item"),
      mana: z.number().optional().describe("Mana bonus provided by the item"),
      strength: z
        .number()
        .optional()
        .describe("Strength bonus provided by the item"),
      dexterity: z
        .number()
        .optional()
        .describe("Dexterity bonus provided by the item"),
      intelligence: z
        .number()
        .optional()
        .describe("Intelligence bonus provided by the item"),
    })
    .optional()
    .describe("Various attributes of the item"),
  requirements: z
    .object({
      level: z.number().describe("Required level to use the item"),
      strength: z.number().describe("Required strength to use the item"),
      dexterity: z.number().describe("Required dexterity to use the item"),
      intelligence: z
        .number()
        .describe("Required intelligence to use the item"),
    })
    .optional()
    .describe("Requirements to use or equip the item"),
  effects: z
    .array(
      z.object({
        type: z.string().describe("Type of effect"),
        value: z.number().describe("Value of the effect"),
        duration: z.number().describe("Duration of the effect in seconds"),
      })
    )
    .optional()
    .describe("Special effects provided by the item"),
  value: z.number().describe("Monetary value of the item"),
  weight: z.number().describe("Weight of the item"),
  iconUrl: z.string().optional().describe("URL to the item's icon image"),
});

export const ResourceSchema = z.object({
  id: z.string().describe("Unique identifier for the resource"),
  name: z.string().describe("Name of the resource"),
  amount: z.number().describe("Amount of the resource available"),
  limitless: z
    .boolean()
    .describe("Whether the resource is infinitely available"),
  collectionTime: z
    .number()
    .describe("Time in seconds it takes to collect the resource"),
  reward_items: z
    .array(
      z.object({
        item: z
          .union([ItemSchema, z.string()])
          .describe("New or existing item"),
        qty: z.number().describe("Quantity of the item rewarded"),
      })
    )
    .describe("Items rewarded when collecting this resource"),
  required_items: z
    .array(
      z.object({
        item: z
          .union([ItemSchema, z.string()])
          .describe("New or existing item")
          .describe("New or existing item"),
        qty: z.number().describe("Quantity of the required item"),
        consumed: z
          .boolean()
          .describe("Whether the item is consumed during collection"),
        itemDurabilityReduction: z
          .number()
          .optional()
          .describe("Optional durability reduction of the item"),
      })
    )
    .describe("Items required to collect this resource"),
  type: z
    .enum(["resource", "workbench", "furnace", "magic"])
    .describe("Type of the resource"),
  verb: z
    .string()
    .describe("Action verb associated with collecting this resource"),
});

export const TileSchema = z.object({
  name: z.string().describe("The name of the tile"),
  color: z.string().describe("The color associated with the tile"),
  theme: z.string().optional().describe("Optional theme for the tile"),
  resources: z
    .array(
      z
        .union([z.string(), ResourceSchema])
        .describe("New or existing resources")
    )
    .describe("Array of new or existing resources available on this tile"),
  rarity: z
    .number()
    .describe("The rarity of the tile (0-1, where 1 is most common)"),
});

export type Tile = z.infer<typeof TileSchema>;
export type Resource = z.infer<typeof ResourceSchema>;
export type Item = z.infer<typeof ItemSchema>;

const Tiles = z
  .object({
    tiles: z
      .array(
        z.object({
          id: z.string().describe("Unique identifier for the tile"),
          name: z.string().describe("The name of the tile"),
          color: z.string().describe("The html color associated with the tile"),
          theme: z.string().optional().describe("Optional theme for the tile"),
          resources: z
            .array(
              z.object({
                id: z.string().describe("Unique identifier for the resource"),
                name: z.string().describe("Name of the resource"),
                amount: z.number().describe("Amount of the resource available"),
                limitless: z
                  .boolean()
                  .describe("Whether the resource is infinitely available"),
                collectionTime: z
                  .number()
                  .describe("Time in seconds it takes to collect the resource"),
                reward_items: z
                  .array(
                    z.object({
                      item: z.string().describe("New or existing item"),
                      qty: z.number().describe("Quantity of the item rewarded"),
                    })
                  )
                  .describe("Items rewarded when collecting this resource"),
                required_items: z
                  .array(
                    z.object({
                      item: z.string().describe("New or existing item"),
                      qty: z.number().describe("Quantity of the required item"),
                      consumed: z
                        .boolean()
                        .describe(
                          "Whether the item is consumed during collection"
                        ),
                      itemDurabilityReduction: z
                        .number()
                        .optional()
                        .describe("Optional durability reduction of the item"),
                    })
                  )
                  .describe("Items required to collect this resource"),
                type: z
                  .enum(["resource", "workbench", "furnace", "magic"])
                  .describe("Type of the resource"),
                verb: z
                  .string()
                  .describe(
                    "Action verb associated with collecting this resource"
                  ),
              })
            )
            .describe(
              "Array of new or existing resources available on this tile"
            ),
          rarity: z
            .number()
            .describe("The rarity of the tile (0-1, where 1 is most common)"),
        })
      )
      .describe("One or more tiles for the game"),
  })
  .strict();

const message = () => `
You are a tile generator that generates RPG tiles based on a users request.
You should take strictly into account the game items, zones, and NPC personalities.

<manifest>
${manifest}
</manifest>
<npcs>
${JSON.stringify(npcs)}
</npcs>
<zones>
${JSON.stringify(tileTypes)}
</zones>
<items>
${JSON.stringify(items)}
</items>
<resources>
${JSON.stringify(resources)}
</resources>

<output-schema>
${JSON.stringify(zodToJsonSchema(Tiles, "tile_response").$schema)}
</output-schema>

Generate 10 new tiles which fit with the theme of the game. The tiles should be unique and not already exist in the game. They can be upgraded versions of existing tiles so long as they can be thematically explained.

Ensure the json output is placed between <tiles> and </tiles> tags.
You MUST output valid json ONLY between the <tiles> and </tiles> tags.
`;

export const generateTiles = async (
  attempt: number = 0
): Promise<z.infer<typeof Tiles>["tiles"] | null> => {
  if (attempt > 3) {
    console.log("Tried too many times...", attempt);
    return null;
  }

  const msg = await anthropic.beta.messages.parse({
    model: "claude-sonnet-4-5",
    max_tokens: 8000,
    messages: [
      {
        role: "user",
        content: message(),
      },
    ],
  });

  if (msg.content[0].type !== "text") {
    console.log("Trying again...", attempt);
    return generateTiles(attempt + 1);
  }

  const start = msg.content[0].text.indexOf("<tiles>") + "<tiles>".length;
  const end = msg.content[0].text.indexOf("</tiles>");

  if (start === -1 || end === -1) {
    console.log("Trying again...", attempt);
    return generateTiles(attempt + 1);
  }

  const tilesText = msg.content[0].text.substring(start, end);

  try {
    const output = JSON.parse(tilesText);
    const parsed = Tiles.safeParse(output);
    if (parsed.success) {
      console.log(JSON.stringify(parsed.data.tiles, null, 2));
      return parsed.data.tiles;
    }
  } catch (e) {
    console.log("JSON parse error, trying again...", attempt);
  }

  return generateTiles(attempt + 1);
};

await generateTiles();
