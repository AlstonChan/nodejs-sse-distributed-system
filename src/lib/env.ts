import { cleanEnv, str, port, host } from "envalid";

const env = cleanEnv(process.env, {
  HOST: str({
    desc: "The host of the server to run",
    devDefault: "127.0.0.1",
  }),
  PORT: port({ desc: "The port of the server to run", devDefault: 3000 }),
  REDIS_HOST: host({ desc: "Redis host", devDefault: "127.0.0.1" }),
  REDIS_PORT: port({ desc: "Redis port", devDefault: 6379 }),
  NODE_ENV: str({ choices: ["development", "test", "production"] }),
});
export default env;
