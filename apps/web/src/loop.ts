import { processActions } from "./user/action.js";
import { cleanupSystemMessages } from "./user/system.js";
import { cleanupResources } from "./world/resources.js";

// prevents TS errors
declare var self: Worker;

let isHighMemory = false;
let isShuttingDown = false;
let name = "unknown";
const MEM_THRESHOLD = 500;

self.addEventListener("message", (event) => {
  switch (event.data) {
    case "shutdown":
      isShuttingDown = true;
      break;
    case "worker-a":
    case "worker-b":
      name = event.data;
      break;
  }
});

setInterval(() => {
  if (isShuttingDown) {
    process.exit();
  }

  Promise.resolve()
    .then(async () => {
      const start = Date.now();
      await cleanupResources();
      await processActions();
      await cleanupSystemMessages();

      if (Date.now() - start > 100) {
        console.log(`LAG: Processed actions in ${Date.now() - start}ms`);
      }

      if (start % 88 === 0) {
        console.log(
          "Memory usage: ",
          name,
          Math.trunc(process.memoryUsage.rss() / 1024 / 1024),
          "MB"
        );
      }
    })
    .catch((err) => console.error(err));
}, 100);

setInterval(() => {
  if (
    !isHighMemory &&
    Math.trunc(process.memoryUsage.rss() / 1024 / 1024) > MEM_THRESHOLD
  ) {
    postMessage("high-memory");
    isHighMemory = true;
  }
}, 1000);
