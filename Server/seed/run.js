import mongoose from 'mongoose';
import { env } from '../src/config/env.js';
import { connectDatabase, disconnectDatabase } from '../src/config/db.js';
import { seedDatabase } from './seed.js';

const flags = new Set(process.argv.slice(2));

async function main() {
  console.log(`[seed] Connecting to MongoDB (${env.nodeEnv})…`);
  await connectDatabase();
  try {
    await seedDatabase({ reset: flags.has('--reset'), ifEmpty: flags.has('--if-empty') });
  } finally {
    await disconnectDatabase();
    await mongoose.connection.close();
  }
}

main().catch((error) => {
  console.error('[seed] Failed:', error.message);
  process.exitCode = 1;
});
