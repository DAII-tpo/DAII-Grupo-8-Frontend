import type { ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { authService } from '../../services/auth/authService';
import { clearSession, readSession, writeSession } from '../../services/auth/authStorage';
import { configureHttpAuth, resetTokenRejection } from '../../services/http/httpClient';
import type { AuthSession, AuthUser, CitizenAuthResponse, CurrentUserResponse, FederatedTokenResponse } from '../../types/auth';
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
      const tokens = current.user.type === 'CITIZEN'
        ? citizenTokens(await authService.citizenRefresh(current.refreshToken))
        : staffTokens(await authService.staffRefresh(current.refreshToken));
      const next: AuthSession = { ...tokens, user: current.user };
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
      const accessToken = stored.expiresAt <= Date.now() + refreshLeewayMs ? await refresh() : stored.accessToken;
      if (!accessToken) return;
      // Una sola consulta por restauración: el rol puede haber cambiado desde el último ingreso.
      const user = toAuthUser(await authService.currentUser(accessToken));
      const latest = readSession();
      if (alive && latest) replaceSession({ ...latest, user });
    };
    restore().catch(() => { if (alive) replaceSession(null); }).finally(() => { if (alive) setIsRestoring(false); });
    return () => { alive = false; };
  }, [refresh, replaceSession]);

  const startSession = useCallback(async (tokens: SessionTokens) => {
    const user = toAuthUser(await authService.currentUser(tokens.accessToken));
    resetTokenRejection();
    replaceSession({ ...tokens, user });
  }, [replaceSession]);
  const loginCitizen = useCallback(async (email: string, password: string) => startSession(citizenTokens(await authService.citizenLogin(email, password))), [startSession]);
  const registerCitizen = useCallback(async (email: string, password: string, firstName: string, lastName: string) => startSession(citizenTokens(await authService.citizenRegister(email, password, firstName, lastName))), [startSession]);
  const loginStaff = useCallback(async (username: string, password: string) => startSession(staffTokens(await authService.staffLogin(username, password))), [startSession]);
  const logout = useCallback(async () => {
    const current = session;
    resetTokenRejection();
    replaceSession(null);
    if (current?.user.type === 'STAFF') try { await authService.staffLogout(current.refreshToken); } catch { /* Local logout is final. */ }
  }, [replaceSession, session]);

  const value = useMemo<AuthContextValue>(() => ({ isAuthenticated: session !== null, isRestoring, user: session?.user ?? null, login: loginCitizen, loginCitizen, registerCitizen, loginStaff, logout }), [isRestoring, loginCitizen, loginStaff, logout, registerCitizen, session]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

type SessionTokens = Omit<AuthSession, 'user'>;

function citizenTokens(response: CitizenAuthResponse): SessionTokens { return { accessToken: response.accessToken, refreshToken: response.refreshToken, expiresAt: Date.now() + response.expiresIn * 1000 }; }
function staffTokens(response: FederatedTokenResponse): SessionTokens { return { accessToken: response.access_token, refreshToken: response.refresh_token, expiresAt: Date.now() + response.expires_in * 1000 }; }
function toAuthUser(profile: CurrentUserResponse): AuthUser {
  return { type: profile.type, userId: profile.id, role: profile.role, email: profile.email ?? '', firstName: profile.firstName ?? '', lastName: profile.lastName ?? '', groups: profile.groups ?? [] };
}
