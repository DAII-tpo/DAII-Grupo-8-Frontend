import axios from 'axios';
import type { InternalAxiosRequestConfig } from 'axios';

declare module 'axios' {
  interface AxiosRequestConfig {
    skipAuth?: boolean;
  }
}

import { env } from '../../config/env';

export const httpClient = axios.create({
  baseURL: env.apiBaseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
});

type HttpAuthHandlers = {
  getAccessToken: () => string | null;
  refresh: () => Promise<string | null>;
  onSessionExpired: () => void;
};

type RetriableRequest = InternalAxiosRequestConfig & { _retried?: boolean };

let authHandlers: HttpAuthHandlers | null = null;
let refreshPromise: Promise<string | null> | null = null;

export function configureHttpAuth(handlers: HttpAuthHandlers | null): void {
  authHandlers = handlers;
}

httpClient.interceptors.request.use((config) => {
  if (config.skipAuth) return config;
  const token = authHandlers?.getAccessToken();
  if (token && !config.headers.Authorization) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

httpClient.interceptors.response.use(undefined, async (error: unknown) => {
  if (!axios.isAxiosError(error) || error.response?.status !== 401 || !authHandlers) return Promise.reject(error);
  const request = error.config as RetriableRequest | undefined;
  if (!request || request.skipAuth || request._retried || request.url?.startsWith('/api/v1/auth/')) return Promise.reject(error);
  request._retried = true;
  refreshPromise ??= authHandlers.refresh().finally(() => { refreshPromise = null; });
  const accessToken = await refreshPromise;
  if (!accessToken) {
    authHandlers.onSessionExpired();
    return Promise.reject(error);
  }
  request.headers.Authorization = `Bearer ${accessToken}`;
  return httpClient(request);
});
