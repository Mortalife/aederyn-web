import { zodResponseFormat } from "openai/helpers/zod.mjs";
import { z } from "zod";
import { npcs, tileTypes, items, resources } from "../config.js";
import { openai } from "../lib/openai.js";
import { manifest } from "./design-doc.js";

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

export const generateTiles = async () => {
  const response = await openai.chat.completions.parse({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `You are a tile generator that generates RPG tiles based on a users request.
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
          `,
      },
      {
        role: "user",
        content:
          "Generate 10 new tiles which fit with the theme of the game. The tiles should be unique and not already exist in the game. The can be upgraded versions of existing tiles so long as they can be thematically explained.",
      },
    ],
    max_tokens: 3000,
    top_p: 1,
    frequency_penalty: 0,
    presence_penalty: 0,
    response_format: zodResponseFormat(Tiles, "tile_response"),
  });

  const tile_response = response.choices[0]?.message;
  if (!tile_response) {
    return null;
  }

  if (tile_response.parsed) {
    const { tiles } = tile_response.parsed;
    console.log(JSON.stringify(tiles, null, 2));
    return tiles;
  } else if (tile_response.refusal) {
    // handle refusal
    console.log("Task refused:", tile_response.refusal);
    return null;
  }
};

await generateTiles();
