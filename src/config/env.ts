const defaultApiBaseUrl = 'http://localhost:8080';
const defaultRecommendationServiceUrl = 'https://movilidad-recommendation.onrender.com';

export const env = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? defaultApiBaseUrl,
  recommendationServiceUrl: import.meta.env.VITE_RECOMMENDATION_SERVICE_URL ?? defaultRecommendationServiceUrl,
} as const;
