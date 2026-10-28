import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authApi } from '../api/resources.js';
import { ApiError } from '../api/client.js';

export const AuthContext = createContext(null);

/**
 * Session provider.
 *
 * The API authenticates with httpOnly cookies, so the client cannot inspect the
 * session itself — it asks `GET /auth/me` once on boot and keeps the result in
 * memory. Nothing sensitive is ever written to localStorage.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | authenticated | anonymous

  const loadSession = useCallback(async () => {
    try {
      const data = await authApi.me();
      setUser(data.user);
      setOrganization(data.organization);
      setStatus('authenticated');
      return data;
    } catch (error) {
      // 401 simply means "no session" — anything else is a real failure and is
      // surfaced through the console so it is never silently swallowed.
      if (!(error instanceof ApiError) || !error.isAuthError) {
        console.error('Failed to load the session:', error.message);
      }
      setUser(null);
      setOrganization(null);
      setStatus('anonymous');
      return null;
    }
  }, []);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  const login = useCallback(async (credentials) => {
    const data = await authApi.login(credentials);
    setUser(data.user);
    setOrganization(data.organization ?? null);
    setStatus('authenticated');
    return data;
  }, []);

  const register = useCallback(async (payload) => {
    const data = await authApi.register(payload);
    setUser(data.user);
    setOrganization(data.organization ?? null);
    setStatus('authenticated');
    return data;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      setUser(null);
      setOrganization(null);
      setStatus('anonymous');
    }
  }, []);

  const refresh = useCallback(() => loadSession(), [loadSession]);

  const value = useMemo(() => {
    const role = user?.role ?? null;
    return {
      user,
      organization,
      role,
      status,
      isAuthenticated: status === 'authenticated',
      isLoading: status === 'loading',
      isAdmin: role === 'ADMIN',
      isDonor: organization?.type === 'DONOR',
      isRecipient: organization?.type === 'RECIPIENT',
      isPartner: organization?.type === 'PARTNER',
      isVolunteer: user?.membershipRole === 'VOLUNTEER' || organization?.type === 'PARTNER',
      isAgent: user?.membershipRole === 'VOLUNTEER' || organization?.type === 'PARTNER',
      isVerified: organization?.verificationStatus === 'APPROVED',
      login,
      register,
      logout,
      refresh,
      refreshOrganization: async () => {
        const data = await authApi.me();
        setUser(data.user);
        setOrganization(data.organization);
        return data;
      },
    };
  }, [user, organization, status, login, register, logout, refresh]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside an AuthProvider');
  return context;
}
