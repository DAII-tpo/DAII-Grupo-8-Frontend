import { createContext, useContext } from 'react';
import type { AuthUser } from '../../config/demoAuth';

export type AuthContextValue = {
  isAuthenticated: boolean;
  user: AuthUser | null;
  login: (email: string, password: string) => boolean;
  logout: () => void;
};

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }

  return context;
}
