# NodeJS SSE Distributed System

Implements Server Sent Events (SSE) in a distributed system using Node.js

- `simple.js` - Contains a simple implementation of SSE with EventEmitter
- `single-server.js` - SSE implementation with BullMQ with EventEmitter
- `multi-server.js` and `multi-server-worker.js` - SSE implementation with BullMQ with Redis Pub/Sub

> [!NOTE]  
> This repository contains the full, runnable code examples for the accompanying blog post: [Server-Sent Events (SSE) in Node.js: From Monoliths to Distributed Systems](http://www.chanalston.com/blog/nodejs-sse-monolith-to-distributed-system/).

## Getting Started

To run the code locally in your machine

1. Firstly, clone the repository into your local machine

   ```bash
   git clone https://github.com/AlstonChan/nodejs-sse-distributed-system.git
   ```

2. Install the required dependency via `npm`

   ```bash
   cd nodejs-sse-distributed-system
   ```

   ```bash
   npm install
   ```

3. Execute the script to run the server

   ```bash
    npm run dev
   ```

   Then open the [client.html](./client.html) file to connect to the server to test SSE connection.

You should explore the [package.json](./package.json) script section to see all the option to run the server.

To run the server with BullMQ implementation, you need a Redis server. You can run the docker compose file - [compose.yml](./compose.yml) to run a Redis server via docker container.

```bash
docker compose -f "compose.yml" up
```

## License

[MIT license](./LICENSE.txt)
