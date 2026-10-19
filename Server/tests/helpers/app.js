import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { createApp } from '../../src/app.js';
import { connectDatabase } from '../../src/config/db.js';

let mongod = null;

export async function startTestApp() {
  mongod = await MongoMemoryServer.create({ binary: { version: '7.0.14' } });
  await connectDatabase(mongod.getUri('staffsync_test'));
  return createApp();
}

export async function stopTestApp() {
  await mongoose.connection.dropDatabase().catch(() => {});
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
  mongod = null;
}

export async function clearDatabase() {
  const collections = await mongoose.connection.db.collections();
  await Promise.all(collections.map((collection) => collection.deleteMany({})));
}
