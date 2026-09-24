import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';

import type { DemoRole } from '../../config/demoAuth';
import { useAuth } from '../providers/authContext';

export function RequireRole({ children, role }: { children: ReactNode; role: DemoRole }) {
  const { user } = useAuth();
  return user?.role === role ? children : <Navigate to="/movilidad" replace />;
}
