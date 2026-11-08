const defaultApiBaseUrl = 'http://localhost:8080';
const defaultRecommendationServiceUrl = 'https://movilidad-recommendation.onrender.com';
const defaultFederatedAuthBaseUrl = 'https://api.citypass-login.pp.ua';

export const env = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? defaultApiBaseUrl,
  recommendationServiceUrl: import.meta.env.VITE_RECOMMENDATION_SERVICE_URL ?? defaultRecommendationServiceUrl,
  federatedAuthBaseUrl: import.meta.env.VITE_FEDERATED_AUTH_BASE_URL ?? defaultFederatedAuthBaseUrl,
  federatedClientId: import.meta.env.VITE_FEDERATED_CLIENT_ID ?? 'citypass-movilidad-web',
} as const;
