import type { AuthSession } from '../../types/auth';

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
  const user = session.user;
  if (user.type === 'CITIZEN') return typeof user.userId === 'number' && user.role === 'USER' && typeof user.email === 'string' && typeof user.firstName === 'string' && typeof user.lastName === 'string';
  return user.type === 'STAFF' && user.userId === null && user.role === 'STAFF' && typeof user.uid === 'string' && typeof user.employeeNumber === 'string' && typeof user.fullName === 'string' && typeof user.email === 'string' && typeof user.module === 'string' && Array.isArray(user.groups) && user.groups.every((group) => typeof group === 'string');
}
