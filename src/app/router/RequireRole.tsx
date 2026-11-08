import { Navigate } from 'react-router-dom';

import type { ReactNode } from 'react';
import { canAccessAdministration } from '../../types/auth';
import { useAuth } from '../providers/authContext';

export function RequireRole({ children }: Readonly<{ children: ReactNode; role?: string }>) {
  const { user } = useAuth();
  return canAccessAdministration(user) ? children : <Navigate to="/movilidad" replace />;
}
