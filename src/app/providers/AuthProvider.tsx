import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';

import { authStorageKey, demoCredentials } from '../../config/demoAuth';
import { AuthContext, type AuthContextValue } from './authContext';

type AuthProviderProps = {
  children: ReactNode;
};

export function AuthProvider({ children }: AuthProviderProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(
    () => window.localStorage.getItem(authStorageKey) === 'true',
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      isAuthenticated,
      login: (email, password) => {
        const isValid =
          email.trim().toLowerCase() === demoCredentials.email
          && password === demoCredentials.password;

        if (isValid) {
          window.localStorage.setItem(authStorageKey, 'true');
          setIsAuthenticated(true);
        }

        return isValid;
      },
      logout: () => {
        window.localStorage.removeItem(authStorageKey);
        setIsAuthenticated(false);
      },
    }),
    [isAuthenticated],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
