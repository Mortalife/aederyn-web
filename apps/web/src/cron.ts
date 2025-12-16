import { client } from "./database.js";
import { questManager, QuestManager } from "./user/quest-generator.js";
import { env } from "./lib/env.js";

const main = async () => {
  await client.execute("select 1");
  const now = new Date();
  if (env.GENERATION_ENABLED && now.getHours() === 0 && now.getMinutes() < 60) {
    console.log("Adding new templates");
    await QuestManager.addNewTemplates();
  }
  console.log("Rotating active quests");
  await questManager.rotateActiveQuests();
};

main().catch(console.error);
