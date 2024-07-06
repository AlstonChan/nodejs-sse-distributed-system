// dotenv configuration
import "dotenv/config";

// External Modules
import { Worker } from "bullmq";
import { Redis } from "ioredis";

// Internal Modules
import env from "../lib/env";
import { processRequestQueue } from "./queues/queueManager";
import processRequest from "./queues/jobs/processRequest";

// Constants
const connection = {
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
};

export const redis = new Redis(connection);

const worker = new Worker(processRequestQueue.name, processRequest, {
  connection,
});

const gracefulShutdown = async (
  signal: "SIGINT" | "SIGTERM",
  worker: Worker<any, any, any>
) => {
  console.log(`Received ${signal}, closing worker...`);
  await worker.close();
  // Other asynchronous closings
  process.exit(0);
};

worker.on("ready", () => {
  console.log(`Worker ${processRequestQueue.name} ready`);
});

process.on("SIGINT", async () => {
  gracefulShutdown("SIGINT", worker);
  await redis.quit();
});
process.on("SIGTERM", async () => {
  gracefulShutdown("SIGTERM", worker);
  await redis.quit();
});
