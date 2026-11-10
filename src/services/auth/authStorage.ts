import { userRoles, type AuthSession } from '../../types/auth';

export const authStorageKey = 'citypass_auth_session';

export function readSession(): AuthSession | null {
  const stored = window.localStorage.getItem(authStorageKey);
  if (!stored) return null;

  try {
    const value: unknown = JSON.parse(stored);
    if (isAuthSession(value)) return value;
  } catch {
    // Invalid persisted session.
  }

  window.localStorage.removeItem(authStorageKey);
  return null;
}

export function writeSession(session: AuthSession): void {
  window.localStorage.setItem(authStorageKey, JSON.stringify(session));
}

export function clearSession(): void {
  window.localStorage.removeItem(authStorageKey);
}

function isAuthSession(value: unknown): value is AuthSession {
  if (!value || typeof value !== 'object') return false;
  const session = value as Partial<AuthSession>;
  if (typeof session.accessToken !== 'string' || typeof session.refreshToken !== 'string' || typeof session.expiresAt !== 'number' || !session.user) return false;
  const user = session.user as Partial<AuthSession['user']>;
  return (user.type === 'CITIZEN' || user.type === 'STAFF')
    && typeof user.userId === 'number'
    && typeof user.role === 'string' && userRoles.includes(user.role)
    && typeof user.email === 'string'
    && typeof user.firstName === 'string'
    && typeof user.lastName === 'string'
    && Array.isArray(user.groups) && user.groups.every((group) => typeof group === 'string');
}
