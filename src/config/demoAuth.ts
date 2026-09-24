export type DemoRole = 'USER' | 'ADMIN';

export type AuthUser = { email: string; role: DemoRole; userId: number };

type DemoAccount = AuthUser & { password: string };

export const demoAccounts: readonly DemoAccount[] = [
  { email: 'user@citypass.com', password: 'citypass123', role: 'USER', userId: 1 },
  { email: 'admin@citypass.com', password: 'citypass123', role: 'ADMIN', userId: 2 },
];

export const authStorageKey = 'citypass_demo_auth';

export function authenticateDemoUser(email: string, password: string): AuthUser | null {
  const account = demoAccounts.find((candidate) => candidate.email === email.trim().toLowerCase() && candidate.password === password);
  return account ? { email: account.email, role: account.role, userId: account.userId } : null;
}

export function isAuthUser(value: unknown): value is AuthUser {
  if (!value || typeof value !== 'object' || !('email' in value) || !('role' in value) || !('userId' in value)) return false;
  if (typeof value.email !== 'string' || (value.role !== 'USER' && value.role !== 'ADMIN') || !Number.isSafeInteger(value.userId)) return false;
  return demoAccounts.some((account) => account.email === value.email && account.role === value.role && account.userId === value.userId);
}
