import type { ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { authService } from '../../services/auth/authService';
import { clearSession, readSession, writeSession } from '../../services/auth/authStorage';
import { configureHttpAuth } from '../../services/http/httpClient';
import type { AuthSession, AuthUser, CitizenAuthResponse, FederatedTokenResponse, FederatedUserInfo } from '../../types/auth';
import { AuthContext, type AuthContextValue } from './authContext';

type AuthProviderProps = Readonly<{ children: ReactNode }>;
const refreshLeewayMs = 60_000;

export function AuthProvider({ children }: AuthProviderProps) {
  const [session, setSession] = useState<AuthSession | null>(() => readSession());
  const [isRestoring, setIsRestoring] = useState(true);
  const sessionRef = useRef<AuthSession | null>(session);
  const replaceSession = useCallback((nextSession: AuthSession | null) => {
    if (nextSession) writeSession(nextSession); else clearSession();
    setSession(nextSession);
  }, []);
  useEffect(() => {
    sessionRef.current = session;
  }, [session]);
  const refresh = useCallback(async (): Promise<string | null> => {
    const current = sessionRef.current ?? readSession();
    if (!current) return null;
    try {
      const next = current.user.type === 'CITIZEN'
        ? citizenSession(await authService.citizenRefresh(current.refreshToken))
        : staffSession(await authService.staffRefresh(current.refreshToken), current.user);
      replaceSession(next);
      return next.accessToken;
    } catch { replaceSession(null); return null; }
  }, [replaceSession]);

  useEffect(() => {
    configureHttpAuth({ getAccessToken: () => session?.accessToken ?? null, refresh, onSessionExpired: () => replaceSession(null) });
    return () => configureHttpAuth(null);
  }, [refresh, replaceSession, session]);

  useEffect(() => {
    let alive = true;
    const restore = async () => {
      const stored = readSession();
      if (!stored) return;
      if (stored.expiresAt <= Date.now() + refreshLeewayMs) {
        await refresh();
      } else if (stored.user.type === 'STAFF') {
        const profile = await authService.staffMe(stored.accessToken);
        if (profile.module !== 'movilidad') throw new Error('Invalid module');
        if (alive) replaceSession({ ...stored, user: staffUser(profile) });
      }
    };
    restore().catch(() => { if (alive) replaceSession(null); }).finally(() => { if (alive) setIsRestoring(false); });
    return () => { alive = false; };
  }, [refresh, replaceSession]);

  const loginCitizen = useCallback(async (email: string, password: string) => replaceSession(citizenSession(await authService.citizenLogin(email, password))), [replaceSession]);
  const registerCitizen = useCallback(async (email: string, password: string, firstName: string, lastName: string) => replaceSession(citizenSession(await authService.citizenRegister(email, password, firstName, lastName))), [replaceSession]);
  const loginStaff = useCallback(async (username: string, password: string) => {
    const tokens = await authService.staffLogin(username, password);
    const profile = await authService.staffMe(tokens.access_token);
    if (profile.module !== 'movilidad') throw new Error('INVALID_STAFF');
    replaceSession(staffSession(tokens, staffUser(profile)));
  }, [replaceSession]);
  const logout = useCallback(async () => {
    const current = session;
    replaceSession(null);
    if (current?.user.type === 'STAFF') try { await authService.staffLogout(current.refreshToken); } catch { /* Local logout is final. */ }
  }, [replaceSession, session]);

  const value = useMemo<AuthContextValue>(() => ({ isAuthenticated: session !== null, isRestoring, user: session?.user ?? null, login: loginCitizen, loginCitizen, registerCitizen, loginStaff, logout }), [isRestoring, loginCitizen, loginStaff, logout, registerCitizen, session]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function citizenSession(response: CitizenAuthResponse): AuthSession { return { accessToken: response.accessToken, refreshToken: response.refreshToken, expiresAt: Date.now() + response.expiresIn * 1000, user: { type: 'CITIZEN', userId: response.userId, email: response.email, firstName: response.firstName, lastName: response.lastName, role: 'USER' } }; }
function staffSession(response: FederatedTokenResponse, user: AuthUser): AuthSession { return { accessToken: response.access_token, refreshToken: response.refresh_token, expiresAt: Date.now() + response.expires_in * 1000, user }; }
function staffUser(profile: FederatedUserInfo): AuthUser { return { type: 'STAFF', userId: null, role: 'STAFF', uid: profile.uid, employeeNumber: profile.employeeNumber, fullName: profile.fullName, email: profile.email, module: profile.module, groups: profile.groups }; }
