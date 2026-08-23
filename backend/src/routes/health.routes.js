import { oracleHealth } from '../oracle/index.js';
import { breakerState } from '../oracle/circuitBreaker.js';
import { pusherState } from '../pusher/hipPusher.js';
import { publisherState } from '../hip3/publisher.js';

export async function healthRoutes(fastify) {
  fastify.get('/health', async () => ({
    status: 'ok',
    timestamp: Math.floor(Date.now() / 1000),
    oracle: oracleHealth(),
    breaker: breakerState(),
    hip3: publisherState(),
    pusher: pusherState(),
  }));
}
