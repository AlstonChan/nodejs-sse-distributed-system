import Fastify from "fastify";
import { Queue, Worker } from "bullmq";
import { EventEmitter } from "events";

const fastify = Fastify({ logger: true });

// Event emitter for pub/sub between worker and SSE
const taskEmitter = new EventEmitter();

// Redis connection config
const connection = {
  host: "localhost",
  port: 6379,
};

// Create BullMQ queue
const taskQueue = new Queue("tasks", { connection });

// Map to track active job sessions
const activeJobs = new Map();

// BullMQ Worker
const worker = new Worker(
  "tasks",
  async (job) => {
    const { taskId, sessionId } = job.data;

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

    // Publish result to SSE clients
    taskEmitter.emit("task-completed", result);

    return result;
  },
  { connection }
);

worker.on("completed", (job) => {
  console.log(`Job ${job.id} completed`);
});

worker.on("failed", (job, err) => {
  console.log(`Job ${job.id} failed with error ${err.message}`);
});

fastify.get("/", (request, reply) => {
  reply.send({ hello: "world" });
});

fastify.get("/events", (request, reply) => {
  reply.raw.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Cache-Control",
  });

  // Handler for task completion events
  const taskCompletedHandler = (data) => {
    try {
      reply.raw.write(`data: ${JSON.stringify(data)}\n\n`);
    } catch (err) {
      console.error("Error writing to SSE stream:", err);
    }
  };

  // Subscribe to task completion events
  taskEmitter.on("task-completed", taskCompletedHandler);

  // Send initial connection message
  reply.raw.write(
    `data: ${JSON.stringify({
      message: "Connected to SSE",
      timestamp: new Date().toISOString(),
    })}\n\n`
  );

  // Send heartbeat every 30 seconds
  const heartbeatId = setInterval(() => {
    try {
      reply.raw.write(`: heartbeat\n\n`);
    } catch (err) {
      clearInterval(heartbeatId);
    }
  }, 30000);

  // Clean up on client disconnect
  request.raw.on("close", () => {
    taskEmitter.off("task-completed", taskCompletedHandler);
    clearInterval(heartbeatId);
    console.log("Client disconnected from SSE");
  });
});

// Start job processing endpoint
fastify.post("/start-jobs", async (request, reply) => {
  const sessionId = `session-${Date.now()}`;

  if (activeJobs.has(sessionId)) {
    return reply.status(400).send({ error: "Job session already running" });
  }

  activeJobs.set(sessionId, true);

  // Add jobs continuously in background
  (async () => {
    let taskCounter = 1;

    while (activeJobs.get(sessionId)) {
      const taskId = `${sessionId}-task-${taskCounter}`;

      await taskQueue.add("process-task", {
        taskId,
        sessionId,
        createdAt: new Date().toISOString(),
      });

      console.log(`Added task ${taskId} to queue`);

      taskCounter++;

      // Random delay between 500ms and 2000ms before adding next task
      const delay = Math.floor(Math.random() * 1500) + 500;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  })();

  reply.send({
    message: "Job processing started",
    sessionId,
  });
});

// Stop job processing endpoint
fastify.post("/stop-jobs", async (request, reply) => {
  let stoppedCount = 0;

  for (const sessionId of activeJobs.keys()) {
    activeJobs.delete(sessionId);
    stoppedCount++;
  }

  reply.send({
    message: "Job processing stopped",
    stoppedSessions: stoppedCount,
  });
});

// Get queue status endpoint
fastify.get("/queue-status", async (request, reply) => {
  const [waiting, active, completed, failed] = await Promise.all([
    taskQueue.getWaitingCount(),
    taskQueue.getActiveCount(),
    taskQueue.getCompletedCount(),
    taskQueue.getFailedCount(),
  ]);

  reply.send({
    waiting,
    active,
    completed,
    failed,
    activeSessions: activeJobs.size,
  });
});

// Enable CORS for local development
fastify.addHook("onRequest", (request, reply, done) => {
  reply.header("Access-Control-Allow-Origin", "*");
  reply.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  reply.header("Access-Control-Allow-Headers", "Content-Type");

  if (request.method === "OPTIONS") {
    reply.send();
    return;
  }

  done();
});

fastify.listen({ port: 3000 }, (err, address) => {
  if (err) throw err;
  console.log(`Server listening at ${address}`);
});
