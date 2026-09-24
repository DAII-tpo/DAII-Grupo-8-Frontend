import { env } from '../config/env';

const healthEndpoint = `${env.recommendationServiceUrl.replace(/\/$/, '')}/health`;

export async function warmUpRecommendationService(): Promise<void> {
  try {
    await fetch(healthEndpoint);
  } catch {
    // The request only starts the remote service and must never affect the UI.
  }
}
