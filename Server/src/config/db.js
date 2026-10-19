import mongoose from 'mongoose';
import { env } from './env.js';

mongoose.set('strictQuery', true);

/**
 * Connects to MongoDB. Logs the host + database name only — never the full
 * URI, because it contains the username and password.
 */
export async function connectDatabase(uri = env.mongoUri) {
  mongoose.connection.on('error', (error) => {
    console.error('[StaffSync] MongoDB connection error:', error.message);
  });
  mongoose.connection.on('disconnected', () => {
    console.warn('[StaffSync] MongoDB disconnected.');
  });

  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 10000,
    maxPoolSize: 10,
  });

  const { host, name } = mongoose.connection;
  console.log(`[StaffSync] MongoDB connected — ${host}/${name}`);
  return mongoose.connection;
}

export async function disconnectDatabase() {
  await mongoose.disconnect();
}
