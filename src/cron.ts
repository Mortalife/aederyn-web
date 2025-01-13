import { client } from "./database";
import { questManager, QuestManager } from "./user/quest-generator";

const main = async () => {
  await client.execute("select 1");
  await QuestManager.addNewTemplates();
  await questManager.rotateActiveQuests();
};

main().catch(console.error);
