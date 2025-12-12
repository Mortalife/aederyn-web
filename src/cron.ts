import { client } from "./database.js";
import { questManager, QuestManager } from "./user/quest-generator.js";

const main = async () => {
  await client.execute("select 1");
  const now = new Date();
  if (now.getHours() === 0 && now.getMinutes() < 60) {
    await QuestManager.addNewTemplates();
  }
  await questManager.rotateActiveQuests();
};

main().catch(console.error);
