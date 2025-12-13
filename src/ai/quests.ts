import { zodResponseFormat } from "openai/helpers/zod.mjs";
import { z } from "zod";
import { npcs, tileTypes, items, resources } from "../config.js";
import schemas, { type Quest } from "../user/quest.js";
import { anthropic } from "../lib/anthropic.js";
import { questManager } from "../user/quest-generator.js";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";

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

const RPGTask = z
  .object({
    quest: schemas.Quest.describe("The quest that the user can complete"),
  })
  .strict();

const message = (quests: string[]) => `
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

<existing-quests>
${JSON.stringify(quests)}
</existing-quests>

Using the provided information about the game, and the required output schema, generate a complex quest which involves multiple objectives that the user can complete and that fits into the world.
Start with describing what the quest is about netweem <description></description> tags.
Ensure the json output is placed between <quest> and </quest>
You MUST output valid json ONLY between the <quest> and </quest> tags.
`;

export const generateQuestTemplates = async (
  attempt: number = 0
): Promise<Quest[] | null> => {
  if (attempt > 0) {
    console.log("Tried too many times...", attempt);
    return null;
  }

  const quests = await questManager.getQuestTemplateNames();

  const msg = await anthropic.beta.messages.parse({
    model: "claude-sonnet-4-5",
    max_tokens: 8000,
    messages: [
      {
        role: "user",
        content: message(quests ?? []),
      },
    ],
  });

  if (msg.content[0].type !== "text") {
    console.log("Trying again...", attempt);
    return generateQuestTemplates(attempt + 1);
  }

  const start = msg.content[0].text.indexOf("<quest>") + "<quest>".length;
  const end = msg.content[0].text.indexOf("</quest>");

  console.log(start, end);
  if (start === -1 || end === -1) {
    console.log("Trying again...", attempt);
    return generateQuestTemplates(attempt + 1);
  }
  const questsText = msg.content[0].text.substring(start, end);

  const output = JSON.parse(questsText);

  if (output && output.quest) {
    const parsed = RPGTask.safeParse(output);
    if (parsed.success) {
      return [parsed.data.quest];
    }
  }

  console.log("Trying again...", attempt);
  return generateQuestTemplates(attempt + 1);
};
