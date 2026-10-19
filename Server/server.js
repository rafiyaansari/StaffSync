import { env } from './src/config/env.js';
import { connectDatabase, disconnectDatabase } from './src/config/db.js';
import { createApp } from './src/app.js';

async function main() {
  await connectDatabase();

  if (env.seedOnStart) {
    const { seedDatabase } = await import('./seed/seed.js');
    await seedDatabase({ ifEmpty: true });
  }

  const app = createApp();
  const server = app.listen(env.port, '0.0.0.0', () => {
    console.log(`[StaffSync] API listening on http://localhost:${env.port}`);
    console.log(`[StaffSync] Allowed client origin(s): ${env.clientUrls.join(', ')}`);
    console.log(`[StaffSync] Health check: http://localhost:${env.port}/api/health`);
  });

  const shutdown = async (signal) => {
    console.log(`\n[StaffSync] ${signal} received — shutting down.`);
    server.close(async () => {
      await disconnectDatabase().catch(() => {});
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000).unref();
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('unhandledRejection', (reason) => {
    console.error('[StaffSync] Unhandled promise rejection:', reason?.message || reason);
  });
}

main().catch((error) => {
  console.error('[StaffSync] Failed to start:', error.message);
  process.exit(1);
});
