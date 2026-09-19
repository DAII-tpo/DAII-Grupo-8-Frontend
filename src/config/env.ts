const defaultApiBaseUrl = 'http://localhost:8080';
const configuredDemoUserId = Number(import.meta.env.VITE_DEMO_USER_ID);
const configuredDemoUserRole = String(import.meta.env.VITE_DEMO_USER_ROLE ?? 'USER').toUpperCase();

export const env = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? defaultApiBaseUrl,
  demoUserId: Number.isSafeInteger(configuredDemoUserId) && configuredDemoUserId > 0
    ? configuredDemoUserId
    : null,
  demoUserRole: configuredDemoUserRole === 'ADMIN' ? 'ADMIN' : 'USER',
} as const;
