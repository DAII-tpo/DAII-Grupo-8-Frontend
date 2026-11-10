export type AuthUser = CitizenUser | StaffUser;

export type UserRole = 'CITIZEN' | 'ADMIN' | 'USER';

export const userRoles: readonly UserRole[] = ['CITIZEN', 'ADMIN', 'USER'];

/** Datos comunes de los dos tipos de usuario. El rol y el id los define el backend (GET /api/v1/users/me). */
type SessionUser = {
  userId: number;
  role: UserRole;
  email: string;
  firstName: string;
  lastName: string;
  groups: string[];
};

export type CitizenUser = SessionUser & { type: 'CITIZEN' };

export type StaffUser = SessionUser & { type: 'STAFF' };

/** Respuesta de GET /api/v1/users/me. */
export type CurrentUserResponse = {
  id: number;
  type: 'CITIZEN' | 'STAFF';
  role: UserRole;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  groups: string[];
};

export type AuthSession = {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
};

export type CitizenAuthResponse = {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  refreshToken: string;
  userId: number;
  email: string;
  firstName: string;
  lastName: string;
  role: 'USER';
};

export type FederatedTokenResponse = {
  access_token: string;
  refresh_token: string;
  token_type: 'Bearer';
  expires_in: number;
};

export function canAccessAdministration(user: AuthUser | null): boolean {
  return user?.role === 'ADMIN';
}

export function getDisplayName(user: AuthUser | null): string {
  if (!user) return 'Usuario';
  const fullName = `${user.firstName} ${user.lastName}`.trim();
  return fullName || user.email || 'Usuario';
}
