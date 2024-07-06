// Nodejs Native module
import path from "node:path";

// External module
import fastify from "fastify";

// Internal module
import env from "./lib/env";

// Controllers
import { getSse, handleSubmittedRequest } from "./controllers/sse.controller";

// Types
declare module "fastify" {
  export interface FastifyInstance {
    env: typeof env;
  }
}
export default async function build(opts = {}) {
  const server = fastify(opts);

  // Register Decorators
  server.decorate("env", {
    ...env,
    isDev: env.isDev,
    isProd: env.isProd,
    isTest: env.isTest,
    isDevelopment: env.isDevelopment,
    isProduction: env.isProduction,
  });

  // Register plugins
  await server.register(import("@fastify/redis"), {
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
  });

  await server.register(import("@fastify/static"), {
    root: path.join(__dirname, "../public"),
    setHeaders: (res) => {
      res.setHeader("cache-control", "public, max-age=31536000");
    },
  });
  await server.register(import("@fastify/static"), {
    root: path.join(__dirname, "../node_modules"),
    prefix: "/modules/",
    decorateReply: false,
    setHeaders: (res) => {
      res.setHeader("cache-control", "public, max-age=31536000");
    },
  });
  await server.register(import("@fastify/view"), {
    engine: {
      ejs: import("ejs"),
    },
    root: path.join(__dirname, "./views"),
    viewExt: "ejs",
    includeViewExtension: true,
  });

  // Register routes
  server.route({
    method: "GET",
    url: "/",
    handler: (request, reply) => {
      reply.view("index");
    },
  });
  server.route({
    method: "POST",
    url: "/submit",
    handler: handleSubmittedRequest,
    schema: {
      body: {
        type: "object",
        properties: {
          data: {
            type: "object",
            properties: {
              foo: { type: "string" },
              clientId: { type: "string" },
            },
            required: ["foo", "clientId"],
          },
        },
      },
      response: {
        200: {
          type: "object",
          properties: {
            message: { status: "string" },
          },
        },
      },
    },
  });
  server.route({
    method: "GET",
    url: "/sse",
    schema: {
      querystring: {
        type: "object",
        properties: {
          clientId: { type: "string" },
        },
        required: ["clientId"],
      },
    },
    handler: getSse,
  });

  return server;
}
