// dotenv configuration
import "dotenv/config";

// Internal Modules
import app from "./app";
import pinoLog from "./lib/pino";
import env from "./lib/env";

const main = async () => {
  const server = await app({ logger: pinoLog });

  server.listen({ port: env.PORT, host: env.HOST }, (err) => {
    if (err) {
      server.log.error(err);
      process.exit(1);
    }
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
