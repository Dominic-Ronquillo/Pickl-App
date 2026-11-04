import { createServer } from 'node:http';
import { env } from './config/env.js';
import { createApp } from './app.js';
import { initRealtime } from './realtime/socket.js';
import { prisma } from './lib/prisma.js';

const server = createServer(createApp());
initRealtime(server);

server.listen(env.PORT, () => console.log(`Courtside API on http://localhost:${env.PORT}/api`));

const shutdown = async () => {
  server.close();
  await prisma.$disconnect();
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
