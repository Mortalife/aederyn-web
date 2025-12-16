let workerA: Worker | null = null;
let workerB: Worker | null = null;

const createWorker = (type: string) => {
  console.log("Creating worker:", type);
  const newWorker = new Worker(new URL("loop.ts", import.meta.url).href);

  newWorker.postMessage(`worker-${type}`);

  newWorker.addEventListener("message", (event) => {
    if (event.data === "high-memory") {
      console.log("Worker has high memory starting another worker");
      startWorker();
    }
  });

  return newWorker;
};

export const startWorker = () => {
  if (!workerA && !workerB) {
    workerA = createWorker("a");
  } else if (!workerA && workerB) {
    workerA = createWorker("a");

    workerB.postMessage("shutdown");
    workerB.addEventListener("close", () => {
      workerB = null;
    });
  } else if (workerA && !workerB) {
    workerB = createWorker("b");

    workerA.postMessage("shutdown");
    workerA.addEventListener("close", () => {
      workerA = null;
    });
  }
};
