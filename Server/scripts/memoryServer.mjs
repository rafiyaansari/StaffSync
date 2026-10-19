/**
 * Optional zero-install MongoDB for local development (no Atlas account).
 *
 *   npm run db:memory
 *
 * Starts a throwaway MongoDB on 127.0.0.1:27017 and keeps it running until you
 * press Ctrl+C. Data lives in a temp folder and disappears when it stops.
 * For persistent data use MongoDB Atlas or a local install (see README).
 */
import { MongoMemoryServer } from 'mongodb-memory-server';

const port = Number(process.env.MEMORY_DB_PORT || 27017);

const mongod = await MongoMemoryServer.create({
  instance: { port, dbName: 'staffsync', storageEngine: 'wiredTiger' },
});

console.log('[db:memory] MongoDB ready (in-memory, temporary).');
console.log(`[db:memory] Use MONGO_URI=mongodb://127.0.0.1:${port}/staffsync in Server/.env`);
console.log('[db:memory] Press Ctrl+C to stop.');

const stop = async () => {
  console.log('\n[db:memory] Stopping…');
  await mongod.stop();
  process.exit(0);
};

process.on('SIGINT', stop);
process.on('SIGTERM', stop);
