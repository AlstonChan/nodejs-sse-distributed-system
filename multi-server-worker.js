import { Worker } from "bullmq";
import Redis from "ioredis";

// Redis connection config
const connection = {
  host: "localhost",
  port: 6379,
};

// Create Redis publisher for sending task completion events
const redisPublisher = new Redis(connection);

// BullMQ Worker
const worker = new Worker(
  "tasks",
  async (job) => {
    const { taskId, sessionId } = job.data;

    console.log(`Processing job ${job.id}: ${taskId}`);

    // Simulate some work
    const duration = Math.floor(Math.random() * 3000) + 1000; // 1-4 seconds
    await new Promise((resolve) => setTimeout(resolve, duration));

    const result = {
      taskId,
      sessionId,
      status: "completed",
      result: `Task ${taskId} completed after ${duration}ms`,
      timestamp: new Date().toISOString(),
    };

    // Publish result to Redis pub/sub channel
    await redisPublisher.publish("task-completed", JSON.stringify(result));

    console.log(`Job ${job.id} completed and published to Redis`);

    return result;
  },
  {
    connection,
    concurrency: 5, // Process up to 5 jobs concurrently
  }
);

worker.on("completed", (job) => {
  console.log(`✓ Job ${job.id} completed successfully`);
});

worker.on("failed", (job, err) => {
  console.error(`✗ Job ${job?.id} failed with error: ${err.message}`);
});

worker.on("error", (err) => {
  console.error("Worker error:", err);
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("SIGTERM received, closing worker...");
  await worker.close();
  await redisPublisher.quit();
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("SIGINT received, closing worker...");
  await worker.close();
  await redisPublisher.quit();
  process.exit(0);
});

console.log("BullMQ Worker started and listening for tasks...");
console.log(`Concurrency: ${worker.opts.concurrency}`);
