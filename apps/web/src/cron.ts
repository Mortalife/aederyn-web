// The app rotates quests itself every hour (see game/loop.ts). This script is
// for forcing a rotation by hand, e.g. after adding quests: `pnpm cron --force`.
import { rotateQuestsOutsideLoop } from "./game/systems/quest-rotation.js";

console.log("Rotating active quests");
rotateQuestsOutsideLoop({ force: process.argv.includes("--force") });
