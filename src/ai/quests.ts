import { zodResponseFormat } from "openai/helpers/zod.mjs";
import { z } from "zod";
import { npcs, tileTypes, items, resources } from "../config";
import { openai } from "../lib/openai";
import { manifest } from "./design-doc";
import schemas, { type Quest } from "../user/quest";
import { anthropic } from "../lib/anthropic";

export const TaskSchema = z.object({
  id: z
    .string()
    .describe("Unique identifier for the task should begin with task_"),
  start_entity_id: z.string().describe("The NPC whom is giving the task."),
  start_zone_id: z.string().describe("The zone the task starts in"),
  name: z.string().describe("The task name"),
  description: z
    .string()
    .describe(
      "The introduction into the task for the user, this can be an overview of a dialog with the NPC."
    ),
  rewards: z
    .array(
      z.object({
        item_id: z.string().describe("The item id of the item"),
        qty: z.number().describe("How many they receive"),
      })
    )
    .describe(
      "A description of the rewards that the user will receive for completing the task"
    ),
  actions: z
    .array(
      z.union([
        z.object({
          type: z.literal("resource-completed"),
          id: z.number().describe("The index of the action"),
          resource_id: z
            .string()
            .describe("The resource the user needs to complete"),
          amount: z
            .number()
            .describe(
              "The number of times the user needs to complete the resource"
            ),
          completion_message: z
            .string()
            .describe(
              "A thematic message to display when processing the resources is completed"
            ),
        }),
        z.object({
          type: z.literal("item-inventory"),
          id: z.number().describe("The index of the action"),
          item_id: z
            .string()
            .describe("The item the user needs to have in their inventory"),
          amount: z
            .number()
            .describe("The amount of the item the user needs to have."),
          completion_message: z
            .string()
            .describe(
              "A thematic message to display when the items are in the inventory"
            ),
        }),
        z.object({
          type: z.literal("item-delivered"),
          id: z.number().describe("The index of the action"),
          item_id: z
            .string()
            .describe("The item the user needs to give to the NPC"),
          amount: z
            .number()
            .describe("The amount of the item the user needs to obtain"),
          completion_message: z
            .string()
            .describe(
              "A thematic message to display when the item is delivered"
            ),
        }),
        z.object({
          type: z.literal("zone-entered"),
          id: z.number().describe("The index of the action"),
          zone_id: z
            .string()
            .describe("The id of the zone the user needs to enter"),
          completion_message: z
            .string()
            .describe("A thematic message to display when the zone is entered"),
        }),
        z.object({
          type: z.literal("npc-found"),
          id: z.number().describe("The index of the action"),
          entity_id: z
            .string()
            .describe("The NPC the user needs to interact with"),
          zone_id: z.string().describe("The id of the zone the NPC is in"),
          dialog: z
            .array(
              z.object({
                speaker: z
                  .union([z.literal("npc"), z.literal("player")])
                  .describe("Who is speaking"),
                text: z.string().describe("The text they say"),
              })
            )
            .describe("A dialog to play when the NPC is found"),
          completion_message: z
            .string()
            .describe("A sign off note to display after speaking with the NPC"),
        }),
      ])
    )
    .describe("One or more actions the user needs to complete for this task"),
  completion_message: z
    .string()
    .describe("The message to send to the user when they complete the task"),
  finish_entity_id: z
    .string()
    .describe("The NPC to which you complete the quest"),
  finish_zone_id: z.string().describe("Where the task ends"),
});

export type Task = z.infer<typeof TaskSchema>;

// const RPGTask = z
//   .object({
//     task: TaskSchema.describe("A tasks that the user can complete"),
//   })
//   .strict();

const RPGTask = z
  .object({
    quests: z
      .array(schemas.Quest)
      .describe("The quests that the user can complete"),
  })
  .strict();

// You are a task generator that generates RPG tasks based on a users request.
//           You should take strictly into account the game items, zones, and NPC personalities.
//           The tasks you generate the player will have 24 hours to complete, before new tasks will be generated.
//           Tasks should play into the NPC's motivations in game.
//           Tasks should generally start in a zone that is different from zone which contains the resource to be collected.
//           Tasks can be completed by interacting with items, resources, zones, or NPCs.

//           Make sure you have a variety of tasks using all available actions.
//           Some examples: NPC's requesting information from other NPCS.
//           Finding a particularly rare zone and entering it.
//           An NPC requesting an item from the player.
//           An NPC requesting a resource from the player to be delivered to another NPC.
//           An NPC meeting the player after they have completed a task in a different zone type.

// Generate a variety of RPG quests based on user requests, considering game items, zones, and NPC personalities.

// The generated quests should:
// - Be completed in 24 hours, after which new tasks will be provided.
// - Align with the NPC's motivations and personalities.
// - Initiate in a zone different from the one containing the key resource.
// - Involve interactions with items, resources, zones, or NPCs.

// Ensure a diversity of tasks, utilizing all available actions and interactions.

// # Steps

// 1. **Understand User Request:** Start by understanding the user’s request, game setting, and available elements such as items, zones, and NPCs.
// 2. **Task Creation:** Design quests that:
//    - Reflect the NPC's motivations.
//    - Start and end in different zones.
//    - Require interaction with various game elements.
// 3. **Diversity of Actions:** Vary the types of tasks generated, incorporating collection, delivery, exploration, and interaction.

// # Notes

// - Ensure each task aligns with the in-game lore and logical constraints.
// - Adjust task complexity based on user's request context and game setup.

const message = `
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
${JSON.stringify(
  zodResponseFormat(RPGTask, "quest_response").json_schema.schema
)}
</output-schema>

Using the provided information about the game, and the required output schema, generate a set of quests complex quests which involved multiple objectives that the user can complete and fit into the world.
Start with describing what the quest is about before outputting the json
Ensure the json output is placed between <quests> and </quests>
`;

export const generateQuestTemplates = async (
  attempt: number = 0
): Promise<Quest[] | null> => {
  if (attempt > 0) {
    console.log("Tried too many times...", attempt);
    return null;
  }

  const msg = await anthropic.messages.create({
    model: "claude-3-5-sonnet-latest",
    max_tokens: 4000,
    messages: [
      {
        role: "user",
        content: message,
      },
    ],
  });

  if (msg.content[0].type !== "text") {
    console.log("Trying again...", attempt);
    return generateQuestTemplates(attempt + 1);
  }

  const start = msg.content[0].text.indexOf("<quests>") + "<quests>".length;
  const end = msg.content[0].text.indexOf("</quests>");
  const questsText = msg.content[0].text.substring(start, end);

  const output = JSON.parse(questsText);

  if (output && output.quests) {
    const parsed = RPGTask.safeParse(output);
    if (parsed.success) {
      return parsed.data.quests;
    }
  }

  console.log("Trying again...", attempt);
  return generateQuestTemplates(attempt + 1);
};
