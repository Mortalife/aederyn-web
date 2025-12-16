import { questManager } from "./user/quest-generator.js";

const main = async () => {
  console.log("Rotating active quests");
  await questManager.rotateActiveQuests();
};

main().catch(console.error);
