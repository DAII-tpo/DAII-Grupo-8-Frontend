import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';

import { authenticateDemoUser, authStorageKey, isAuthUser, type AuthUser } from '../../config/demoAuth';
import { AuthContext, type AuthContextValue } from './authContext';

type AuthProviderProps = {
  children: ReactNode;
};

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(() => readStoredUser());
  const isAuthenticated = user !== null;

  const value = useMemo<AuthContextValue>(
    () => ({
      isAuthenticated,
      user,
      login: (email, password) => {
        const authenticatedUser = authenticateDemoUser(email, password);
        if (!authenticatedUser) return false;
        window.localStorage.setItem(authStorageKey, JSON.stringify(authenticatedUser));
        setUser(authenticatedUser);
        return true;
      },
      logout: () => {
        window.localStorage.removeItem(authStorageKey);
        setUser(null);
      },
    }),
    [isAuthenticated, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function readStoredUser(): AuthUser | null {
  const stored = window.localStorage.getItem(authStorageKey);
  if (!stored) return null;
  try {
    const user: unknown = JSON.parse(stored);
    if (isAuthUser(user)) return user;
  } catch { /* Invalid persisted session. */ }
  window.localStorage.removeItem(authStorageKey);
  return null;
}
