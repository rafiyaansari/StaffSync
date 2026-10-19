/**
 * The single API entry point used by the whole UI.
 *
 * Live mode (default): calls the Express + MongoDB API in ../Server.
 * Mock mode: self-contained demo data in localStorage, no backend needed.
 *
 * Optional `.env` in the Client folder:
 *   VITE_API_MODE=mock                          (float the UI without a server)
 *   VITE_API_URL=http://localhost:5000/api      (only if you don't use the Vite proxy)
 */
import { mockApi } from './mockApi';
import { liveApi } from './liveApi';

export const API_MODE = import.meta.env.VITE_API_MODE === 'mock' ? 'mock' : 'live';
export const USING_MOCK_API = API_MODE === 'mock';

export const api = USING_MOCK_API ? mockApi : liveApi;

export default api;
