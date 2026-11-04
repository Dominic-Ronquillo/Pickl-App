import { createServer } from 'node:http';
import { env } from './config/env.js';
import { createApp } from './app.js';
import { initRealtime } from './realtime/socket.js';
import { prisma } from './lib/prisma.js';
import { logger } from './lib/logger.js';

const server = createServer(createApp());
initRealtime(server);

server.listen(env.PORT, () => logger.info(`Courtside API on http://localhost:${env.PORT}/api`));

const shutdown = async (signal: string) => {
  logger.info({ signal }, 'Shutting down');
  server.close();
  await prisma.$disconnect();
  process.exit(0);
};
process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
