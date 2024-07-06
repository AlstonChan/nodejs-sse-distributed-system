// Internal modules
import { redis } from "../../../workers/processRequestWorker";

// Types
import type { Job } from "bullmq";

export default async (job: Job<{ clientId: string; foo: string }>) => {
  // Process the request here, here we wait for 5 seconds
  // to simulate a heavy workload.
  await new Promise((resolve) => setTimeout(resolve, 5000));

  // You can save the processed result to db here or do
  // any other post-processing work.

  // the worker will publish a message through redis
  // pub/sub to transmit the message to the server,
  // so the server can send the message to the client.

  console.log(job.data);

  const instanceId = await redis.get(`sse:${job.data.clientId}`);
  if (instanceId)
    if (job.data.foo === "bar") {
      await redis.publish(
        `sse:req:${instanceId}`,
        JSON.stringify({
          clientId: `${job.data.clientId}`,
          status: "success",
          from: instanceId,
        })
      );
    } else {
      await redis.publish(
        `sse:req:${instanceId}`,
        JSON.stringify({
          clientId: `${job.data.clientId}`,
          status: "failed",
          from: instanceId,
        })
      );
    }
};
