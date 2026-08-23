import { getPrice } from '../oracle/index.js';
import { config } from '../config.js';

export async function oracleRoutes(fastify) {
  fastify.get('/oracle/price/:symbol', async (req, reply) => {
    const { symbol } = req.params;
    const supported = config.oracle.symbol;

    if (symbol.toUpperCase() !== supported) {
      return reply.code(404).send({ error: `Symbol ${symbol} not supported. Supported: ${supported}` });
    }

    try {
      return getPrice();
    } catch {
      return reply.code(503).send({ error: 'Oracle not ready yet' });
    }
  });
}
