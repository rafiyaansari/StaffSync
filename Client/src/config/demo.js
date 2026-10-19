/**
 * Demo sign-in shortcuts are only a convenience for the seeded demo workspace.
 * They are shown in mock mode by default, and in live mode only when the build
 * explicitly opts in with VITE_DEMO_LOGINS=true (see Client/.env.example).
 */
import { USING_MOCK_API } from '../services/api';

const flag = String(import.meta.env.VITE_DEMO_LOGINS ?? '').toLowerCase();

export const DEMO_LOGINS_ENABLED = USING_MOCK_API || flag === 'true';

export default DEMO_LOGINS_ENABLED;
