// Types
import type { FastifyReply } from "fastify";

/**
 * A singleton class to store the connected clients, this needs to be a singleton
 * because we need to share the same instance across the application. This store's
 * data is only accessible by the server instance.
 * @class SSEClientStore
 */
class SSEClientStore {
  private clients: Map<string, FastifyReply>;

  /**
   * Constructor for Services Class
   * @param redis The ioredis instance
   */
  constructor() {
    this.clients = new Map();
  }

  /**
   * Add a client to the store
   * @param clientId The assigned id of the client
   * @param reply The FastifyReply instance
   */
  addClient(clientId: string, reply: FastifyReply) {
    this.clients.set(clientId, reply);
  }

  /**
   * Get a client from the store
   * @param clientId The assigned id of the client
   * @returns The FastifyReply instance
   */
  getClient(clientId: string): FastifyReply | undefined {
    return this.clients.get(clientId);
  }

  /**
   * Remove a client from the store
   * @param clientId The assigned id of the client
   */
  removeClient(clientId: string) {
    this.clients.delete(clientId);
  }

  /**
   * Check if a client exists in the store
   * @param clientId The assigned id of the client
   * @returns A boolean indicating if the client exists
   */
  hasClient(clientId: string): boolean {
    return this.clients.has(clientId);
  }
}
export default Object.freeze(new SSEClientStore());
