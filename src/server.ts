// dotenv configuration
import "dotenv/config";

// External Modules
import { Redis } from "ioredis";

// Internal Modules
import app from "./app";
import pinoLog from "./lib/pino";
import env from "./lib/env";
import SseClientStore from "./services/SseClientStore";

// Constant
const redisSub = new Redis();
import { INSTANCE_ID } from "./lib/constant";

const main = async () => {
  const server = await app({ logger: pinoLog });

  server.listen({ port: env.PORT, host: env.HOST }, (err) => {
    if (err) {
      server.log.error(err);
      process.exit(1);
    }

    // Redis subscribe to sse channel
    redisSub.subscribe(`sse:req:${INSTANCE_ID}`, (err, count) => {
      if (err) {
        server.log.error("Failed to subscribe to SSE channel");
        server.log.error(err);
      } else {
        server.log.info(`Subscribed to SSE channel ( channel count: ${count})`);
      }
    });

    redisSub.on("message", (channel, message) => {
      const data = JSON.parse(message);
      const clientReplyObj = SseClientStore.getClient(data.clientId);

      if (clientReplyObj)
        return clientReplyObj.raw.write(`data: ${message}\n\n`);
    });
  });

  // To handle the shutdown of the server gracefully
  ["SIGINT", "SIGTERM"].forEach((signal) => {
    process.on(signal, () => {
      server.log.info(`Signal received: ${signal}`);
      server.close().then(() => {
        server.log.info("Server closed successfully");
        process.exit(0);
      });
    });
  });
};

main();
