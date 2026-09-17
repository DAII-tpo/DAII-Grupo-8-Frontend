import { env } from './env';

// Temporary bridge until the federated login provides the current user's identity.
export const currentUserId = env.demoUserId;
