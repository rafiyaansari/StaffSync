/**
 * Optional DNS preload for networks where the default resolver cannot look up
 * MongoDB Atlas SRV records (a known issue on some Windows/VPN setups).
 *
 * This is a DEVELOPMENT WORKAROUND, not part of the application. It changes the
 * DNS servers of the current Node process only — nothing is written to the OS,
 * no hostnames or IP addresses are hardcoded, and normal `npm start` never
 * loads this file.
 *
 * Usage:
 *   npm run dev:dns                # server with the override
 *   npm run db:doctor:dns          # doctor with the override
 *   DNS_SERVERS=1.1.1.1 npm run dev:dns
 *
 * In production (Render, Railway, Fly, a VPS, Azure…) the platform resolver
 * works normally; do not use this there.
 */
import dns from 'node:dns';

const servers = (process.env.DNS_SERVERS || '8.8.8.8,1.1.1.1')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);

if (servers.length === 0) {
  console.warn('[dns] DNS_SERVERS is empty — keeping the system resolver.');
} else {
  dns.setServers(servers);
  console.log(`[dns] Using DNS servers for this process: ${servers.join(', ')}`);
}
