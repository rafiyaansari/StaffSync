import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function restoreSession() {
      const session = api.auth.currentSession?.();
      if (!session) {
        setInitializing(false);
        return;
      }
      try {
        const me = await api.auth.me();
        if (!cancelled) setUser(me || null);
      } catch (error) {
        console.warn('[StaffSync] Session restore failed.', error);
        if (error.offline) {
          // Keep the token so the session can be restored once the API is back.
          try {
            sessionStorage.setItem('staffsync.apiOffline', '1');
          } catch {
            /* storage unavailable */
          }
        } else if (error.status === 401 || error.status === 403) {
          api.auth.logout();
        }
      } finally {
        if (!cancelled) setInitializing(false);
      }
    }
    restoreSession();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const handleExpired = () => setUser(null);
    window.addEventListener('staffsync:session-expired', handleExpired);
    return () => window.removeEventListener('staffsync:session-expired', handleExpired);
  }, []);

  const login = useCallback(async (email, password) => {
    const result = await api.auth.login({ email, password });
    // Defence in depth: the live adapter already validates this, but a bad
    // response must never install an unusable user in state.
    if (!result?.user || typeof result.user !== 'object') {
      throw new Error(
        'StaffSync could not complete sign-in: the server response did not include a user profile. Check the API server logs.',
      );
    }
    setUser(result.user);
    return result.user;
  }, []);

  const logout = useCallback(() => {
    api.auth.logout();
    setUser(null);
  }, []);

  const register = useCallback(async (payload) => api.auth.register(payload), []);

  const changePassword = useCallback(
    async (payload) => {
      const result = await api.auth.changePassword({ ...payload, employeeId: user?.id });
      return result;
    },
    [user?.id],
  );

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      initializing,
      role: user?.systemRole || user?.role || null,
      login,
      register,
      logout,
      changePassword,
      setUser,
    }),
    [user, initializing, login, register, logout, changePassword],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>');
  return context;
}
