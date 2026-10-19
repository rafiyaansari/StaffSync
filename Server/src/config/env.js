/**
 * Environment loading + validation.
 * The server refuses to start with a missing or unsafe configuration.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');

// Load Server/.env (never committed). Real process env always wins.
dotenv.config({ path: path.join(ROOT, '.env') });

const errors = [];

function str(name, { required = false, min = 0, fallback = undefined } = {}) {
  const raw = process.env[name];
  if (raw === undefined || raw === null || String(raw).trim() === '') {
    if (required) errors.push(`${name} is required. Copy Server/.env.example to Server/.env and fill it in.`);
    return fallback;
  }
  const value = String(raw).trim();
  if (min && value.length < min) {
    errors.push(`${name} must be at least ${min} characters long.`);
  }
  return value;
}

const nodeEnv = str('NODE_ENV', { fallback: 'development' });
const port = Number(str('PORT', { fallback: '5000' }));

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  errors.push('PORT must be a whole number between 1 and 65535.');
}

const jwtSecret = str('JWT_SECRET', { required: true, min: 32 });
const mongoUri = str('MONGO_URI', { required: true });
const clientUrls = String(str('CLIENT_URL', { fallback: 'http://localhost:5173' }))
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);

if (jwtSecret && /change-me|your-secret|example|replace-with|placeholder|changeme/i.test(jwtSecret)) {
  errors.push('JWT_SECRET still looks like a placeholder. Generate a real random secret (32+ characters).');
}

if (mongoUri && !/^mongodb(\+srv)?:\/\//.test(mongoUri)) {
  errors.push('MONGO_URI must start with mongodb:// or mongodb+srv://.');
}

if (errors.length) {
  const message = ['Invalid server configuration:', ...errors.map((line) => `  - ${line}`)].join('\n');
  throw new Error(message);
}

export const env = {
  nodeEnv,
  isProduction: nodeEnv === 'production',
  isTest: nodeEnv === 'test',
  port,
  mongoUri,
  jwtSecret,
  jwtExpiresIn: str('JWT_EXPIRES_IN', { fallback: '7d' }),
  clientUrls,
  bcryptRounds: Number(str('BCRYPT_ROUNDS', { fallback: '12' })),
  jsonLimit: str('JSON_BODY_LIMIT', { fallback: '100kb' }),
  rateLimitWindowMs: Number(str('RATE_LIMIT_WINDOW_MS', { fallback: '900000' })),
  rateLimitMax: Number(str('RATE_LIMIT_MAX', { fallback: '50' })),
  seedOnStart: String(str('SEED_ON_START', { fallback: 'false' })).toLowerCase() === 'true',
  // Used by npm run seed and npm run db:doctor. Never used for real accounts.
  seedDemoPassword: str('SEED_DEMO_PASSWORD', { fallback: 'StaffSync@123' }),
};

export default env;
