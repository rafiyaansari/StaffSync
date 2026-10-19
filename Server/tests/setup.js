/**
 * Loaded with `node --test --import ./tests/setup.js`.
 * Sets safe test values BEFORE src/config/env.js is evaluated anywhere.
 */
process.env.NODE_ENV = 'test';
process.env.PORT = '5099';
process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/staffsync-test-placeholder';
process.env.JWT_SECRET = 'test-only-jwt-secret-0123456789-abcdefghijklmnop';
process.env.JWT_EXPIRES_IN = '1h';
process.env.CLIENT_URL = 'http://localhost:5173';
process.env.BCRYPT_ROUNDS = '4';
process.env.RATE_LIMIT_MAX = '10000';
process.env.JSON_BODY_LIMIT = '2mb';
