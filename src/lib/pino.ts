// Nodejs native modules
import { lstatSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

// External modules
import pino from "pino";

// Internal modules
import env from "./env";

// Types
import type {
  FastifyLoggerOptions,
  PinoLoggerOptions,
} from "fastify/types/logger";
import { RawServerDefault } from "fastify";

interface LoggerOptions {
  development:
    | (FastifyLoggerOptions<RawServerDefault> & PinoLoggerOptions)
    | boolean;
  test: (FastifyLoggerOptions<RawServerDefault> & PinoLoggerOptions) | boolean;
  production:
    | (FastifyLoggerOptions<RawServerDefault> & PinoLoggerOptions)
    | boolean;
}

// Check if log folder exists
const logDir = resolve(__dirname, "../../logs");
try {
  const logDirExists = lstatSync(logDir).isDirectory();

  if (!logDirExists) {
    mkdirSync(logDir);
  }
} catch (error) {
  if (error instanceof Error) {
    console.error("Error message", error.message);
    console.error("Error stack trace", error.stack);
  } else {
    console.error("Unknown Error", error);
  }
  console.log("Creating logs directory");
  mkdirSync(logDir);
}

export const developmentTransport: pino.TransportTargetOptions<
  Record<string, string | boolean>
>[] = [
  {
    target: "pino-pretty",
    options: {
      colorize: true,
      translateTime: "SYS:h:MM:ss TT Z o",
      ignore: "pid,hostname",
    },
  },
  {
    target: "pino/file",
    level: "debug",
    options: { destination: "logs/dev.log" },
  },
];
export const productionTransport: pino.TransportTargetOptions<
  Record<string, string | boolean>
>[] = [
  {
    target: "pino/file",
  },
  {
    target: "pino/file",
    options: { destination: "logs/prod.log" },
  },
];
// Great guide on configuring pino logger
// https://betterstack.com/community/guides/logging/how-to-install-setup-and-use-pino-to-log-node-js-applications/#transporting-your-node-js-logs
const envToLogger: LoggerOptions = {
  development: {
    level: "debug",
    transport: {
      targets: developmentTransport,
    },
  },
  production: {
    transport: {
      targets: productionTransport,
    },
  },
  test: false,
};

export default envToLogger[env.NODE_ENV];
