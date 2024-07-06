// Internal module
import { processRequestQueue } from "../workers/queues/queueManager";
import { INSTANCE_ID } from "../lib/constant";
import sseClientStore from "../services/SseClientStore";

// Types
import type { FastifyReply, FastifyRequest } from "fastify";

export async function handleSubmittedRequest(
  request: FastifyRequest<{ Body: { foo: string; clientId: string } }>,
  reply: FastifyReply
) {
  const reqBody = request.body;

  // Validation and other logic here, then pass the heavy workload
  // to the worker.

  // Queue the request to bullmq
  await processRequestQueue.add("processRequest", reqBody);

  return reply.status(200).send({ status: "processing" });
}

export async function getSse(
  request: FastifyRequest<{ Querystring: { clientId: string } }>,
  reply: FastifyReply
) {
  const reqQuery = request.query;

  const clientId = reqQuery.clientId;

  // Required SSE Headers
  reply.raw.setHeader("Content-Type", "text/event-stream");
  reply.raw.setHeader("Cache-Control", "no-cache");
  reply.raw.setHeader("Connection", "keep-alive");
  // Required for CORS
  reply.raw.setHeader("Access-Control-Allow-Origin", "*");
  reply.raw.setHeader("Access-Control-Allow-Methods", "GET");

  let id = 0;
  const keepAliveInterval = setInterval(() => {
    reply.raw.write(`data: keep alive\nid:${id}\n\n`);
    id++;
  }, 15000);

  // Handle the connection
  reply.raw.on("close", async () => {
    request.server.log.info("Client disconnected");
    clearInterval(keepAliveInterval);
    // Client has disconnected, remove the client from the store
    await request.server.redis.del(`sse:${clientId}`);
    sseClientStore.removeClient(clientId);
  });

  // Add the client to the store
  await request.server.redis.set(`sse:${clientId}`, INSTANCE_ID);
  sseClientStore.addClient(clientId, reply);

  // Send the initial response
  reply.raw.write(
    `data: ${JSON.stringify({ clientId, data: "hello world" })}\n\n`
  );
  await reply;
}
