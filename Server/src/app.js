import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';
import routes from './routes/index.js';

const LOCAL_ORIGIN = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.disable('etag'); // always send fresh JSON; the SPA refreshes after every mutation
  app.set('trust proxy', 1);

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  const allowlist = new Set(env.clientUrls);
  const originAllowed = (origin) =>
    !origin || allowlist.has(origin) || (!env.isProduction && LOCAL_ORIGIN.test(origin));

  // Reject unknown browser origins with a clear 403 instead of a CORS-less 500.
  app.use((req, res, next) => {
    if (!originAllowed(req.headers.origin)) {
      return res.status(403).json({ message: `Origin ${req.headers.origin} is not allowed. Check CLIENT_URL in Server/.env.` });
    }
    return next();
  });

  app.use(
    cors({
      origin: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      exposedHeaders: ['Content-Length'],
      maxAge: 86400,
    }),
  );

  app.use(express.json({ limit: env.jsonLimit }));
  app.use(express.urlencoded({ extended: false, limit: env.jsonLimit }));

  if (!env.isTest) {
    morgan.token('safe-url', (req) => req.originalUrl.replace(/token=[^&]+/gi, 'token=***'));
    app.use(morgan(env.isProduction ? 'combined' : 'tiny'));
  }

  app.get('/', (_req, res) => {
    res.json({
      name: 'StaffSync API',
      version: '1.0.0',
      docs: 'See Server/README-API.md or the main README for the endpoint list.',
      health: '/api/health',
    });
  });

  app.use('/api', routes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

export default createApp;
