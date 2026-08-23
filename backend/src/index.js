import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { config, configErrors, describeConfig } from './config.js';
import { startOracle, stopOracle } from './oracle/index.js';
import { startPusher, stopPusher } from './pusher/hipPusher.js';
import { startPublisher, stopPublisher } from './hip3/publisher.js';
import { healthRoutes } from './routes/health.routes.js';
import { oracleRoutes } from './routes/oracle.routes.js';
import { marketRoutes } from './routes/market.routes.js';

// Fail fast and loudly: a typo in the oracle thresholds silently disabling the
// circuit breaker is worse than not booting at all.
if (configErrors.length) {
  console.error('[config] Invalid configuration — refusing to start:');
  for (const problem of configErrors) console.error(`  - ${problem}`);
  process.exit(1);
}

const fastify = Fastify({ logger: true });

await fastify.register(cors, { origin: config.corsOrigins });
await fastify.register(rateLimit, { max: 100, timeWindow: '1 minute' });

await fastify.register(healthRoutes);
await fastify.register(oracleRoutes);
await fastify.register(marketRoutes);

fastify.log.info({ config: describeConfig() }, 'resolved configuration');

startOracle(config.oracle.symbol).catch((err) => {
  fastify.log.error({ err }, 'oracle failed to start');
});
startPusher();
startPublisher();

// Both loops run on timers; without clearing them the process ignores Ctrl-C and
// `node --watch` reloads pile up polling loops on the same port.
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.once(signal, async () => {
    console.log(`[shutdown] ${signal} received — stopping oracle and pusher`);
    stopOracle();
    stopPusher();
    stopPublisher();
    try {
      await fastify.close();
    } catch (err) {
      fastify.log.error({ err }, 'error while closing server');
    }
    process.exit(0);
  });
}

try {
  await fastify.listen({ port: config.port, host: '0.0.0.0' });
  console.log(`austral.fi backend running on port ${config.port}`);
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}
