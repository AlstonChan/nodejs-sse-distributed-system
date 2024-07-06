// External Modules
import { Queue } from "bullmq";

// Internal Modules
import env from "../../lib/env";

// Constants
const connection = {
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
};

export const processRequestQueue = new Queue("processRequestQueue", {
  connection,
  defaultJobOptions: { removeOnComplete: 1000, removeOnFail: 2000 },
});
