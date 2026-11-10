import { createContext, useContext } from 'react';
import type { AuthUser } from '../../types/auth';

export type AuthContextValue = {
  isAuthenticated: boolean;
  isRestoring: boolean;
  user: AuthUser | null;
  loginCitizen: (email: string, password: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  registerCitizen: (email: string, password: string, firstName: string, lastName: string) => Promise<void>;
  loginStaff: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }

  return context;
}
