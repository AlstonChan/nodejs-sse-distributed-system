import Fastify from "fastify";
import { Queue } from "bullmq";
import Redis from "ioredis";

const fastify = Fastify({ logger: true });

// Redis connection config
const connection = {
  host: "localhost",
  port: 6379,
};

// Create Redis clients for pub/sub
const redisSubscriber = new Redis(connection);
const redisPublisher = new Redis(connection);

// Create BullMQ queue
const taskQueue = new Queue("tasks", { connection });

// Map to track active job sessions
const activeJobs = new Map();

// Subscribe to task completion channel
await redisSubscriber.subscribe("task-completed");

// Store all SSE response streams
const sseClients = new Set();

// Handle incoming messages from Redis
redisSubscriber.on("message", (channel, message) => {
  if (channel === "task-completed") {
    // Broadcast to all connected SSE clients
    for (const client of sseClients) {
      try {
        client.write(`data: ${message}\n\n`);
      } catch (err) {
        console.error("Error writing to SSE client:", err);
        sseClients.delete(client);
      }
    }
  }
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

  sseClients.add(reply.raw);

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
      sseClients.delete(reply.raw);
    }
  }, 30000);

  // Clean up on client disconnect
  request.raw.on("close", () => {
    sseClients.delete(reply.raw);
    clearInterval(heartbeatId);
    console.log(`Client disconnected from SSE. Active clients: ${sseClients.size}`);
  });

  console.log(`Client connected to SSE. Active clients: ${sseClients.size}`);
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
    connectedClients: sseClients.size,
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

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("SIGTERM received, closing server...");
  await fastify.close();
  await redisSubscriber.quit();
  await redisPublisher.quit();
  process.exit(0);
});

fastify.listen({ port: 3000 }, (err, address) => {
  if (err) throw err;
  console.log(`Server listening at ${address}`);
  console.log(`Redis subscriber connected, listening to task-completed channel`);
});
