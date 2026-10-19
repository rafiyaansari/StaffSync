#!/usr/bin/env node
/**
 * Starts the API with the optional DNS override (development only).
 *
 *   npm run dev:dns
 *
 * Equivalent to `npm run dev`, except this process resolves DNS through the
 * servers listed in DNS_SERVERS (default 8.8.8.8, 1.1.1.1). Useful when Atlas
 * SRV lookups fail with ENOTFOUND / querySrv ECONNREFUSED on Windows.
 *
 * Do not use this in production: hosting platforms resolve DNS correctly and
 * hardcoding public resolvers there is an unnecessary dependency.
 */
import './dns-preload.mjs';

await import('../server.js');
