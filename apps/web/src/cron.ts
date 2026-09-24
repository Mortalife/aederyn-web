// The app rotates contracts itself (see game/loop.ts). This script is for
// forcing a rotation by hand, e.g. after editing contracts: `pnpm cron --force`.
import { rotateContractsOutsideLoop } from "./game/systems/contract-rotation.js";

console.log("Rotating contracts");
rotateContractsOutsideLoop({ force: process.argv.includes("--force") });
