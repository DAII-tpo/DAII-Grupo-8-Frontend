import { AxiosError } from 'axios';
import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { configureHttpAuth, httpClient } from './httpClient';

const originalAdapter = httpClient.defaults.adapter;

function success(config: InternalAxiosRequestConfig): AxiosResponse {
  return { config, data: { ok: true }, headers: {}, status: 200, statusText: 'OK' };
}

function unauthorized(config: InternalAxiosRequestConfig, status = 401): AxiosError {
  const response: AxiosResponse = { config, data: {}, headers: {}, status, statusText: 'Unauthorized' };
  return new AxiosError('Unauthorized', undefined, config, undefined, response);
}

afterEach(() => {
  configureHttpAuth(null);
  httpClient.defaults.adapter = originalAdapter;
});

describe('httpClient authentication', () => {
  it('agrega Bearer y nunca agrega X-User-Id', async () => {
    configureHttpAuth({ getAccessToken: () => 'access-token', refresh: vi.fn(), onSessionExpired: vi.fn() });
    const adapter = vi.fn(async (config: InternalAxiosRequestConfig) => success(config));
    httpClient.defaults.adapter = adapter;

    await httpClient.get('/secured');

    const request = adapter.mock.calls[0][0] as InternalAxiosRequestConfig;
    expect(request.headers.Authorization).toBe('Bearer access-token');
    expect(request.headers['X-User-Id']).toBeUndefined();
  });

  it('omite Bearer y refresh en las consultas públicas', async () => {
    const refresh = vi.fn();
    configureHttpAuth({ getAccessToken: () => 'staff-token', refresh, onSessionExpired: vi.fn() });
    httpClient.defaults.adapter = async (config) => {
      expect(config.headers.Authorization).toBeUndefined();
      throw unauthorized(config);
    };

    await expect(httpClient.get('/api/v1/stations/nearby', { skipAuth: true })).rejects.toBeInstanceOf(AxiosError);
    expect(refresh).not.toHaveBeenCalled();
  });

  it('reintenta la solicitud con el token nuevo tras un refresh ciudadano', async () => {
    let attempts = 0;
    const authorizations: unknown[] = [];
    const refresh = vi.fn().mockResolvedValue('citizen-new-access');
    configureHttpAuth({ getAccessToken: () => 'citizen-old-access', refresh, onSessionExpired: vi.fn() });
    httpClient.defaults.adapter = async (config) => {
      attempts += 1;
      authorizations.push(config.headers.Authorization);
      if (attempts === 1) throw unauthorized(config);
      return success(config);
    };

    await httpClient.get('/citizen-resource');

    expect(refresh).toHaveBeenCalledOnce();
    expect(attempts).toBe(2);
    expect(authorizations).toEqual(['Bearer citizen-old-access', 'Bearer citizen-new-access']);
  });

  it('comparte un único refresh entre varias solicitudes 401', async () => {
    const refresh = vi.fn().mockResolvedValue('rotated-access');
    configureHttpAuth({ getAccessToken: () => 'old-access', refresh, onSessionExpired: vi.fn() });
    httpClient.defaults.adapter = async (config) => {
      if (config.headers.Authorization === 'Bearer old-access') throw unauthorized(config);
      return success(config);
    };

    await Promise.all([httpClient.get('/one'), httpClient.get('/two')]);

    expect(refresh).toHaveBeenCalledOnce();
  });

  it('limpia la sesión cuando el refresh falla', async () => {
    const onSessionExpired = vi.fn();
    configureHttpAuth({ getAccessToken: () => 'old-access', refresh: vi.fn().mockResolvedValue(null), onSessionExpired });
    httpClient.defaults.adapter = async (config) => { throw unauthorized(config); };

    await expect(httpClient.get('/expired')).rejects.toBeInstanceOf(AxiosError);

    expect(onSessionExpired).toHaveBeenCalledOnce();
  });

  it('propaga un 403 sin renovar ni cerrar la sesión', async () => {
    const refresh = vi.fn();
    const onSessionExpired = vi.fn();
    configureHttpAuth({ getAccessToken: () => 'access-token', refresh, onSessionExpired });
    httpClient.defaults.adapter = async (config) => { throw unauthorized(config, 403); };

    await expect(httpClient.get('/forbidden')).rejects.toBeInstanceOf(AxiosError);

    expect(refresh).not.toHaveBeenCalled();
    expect(onSessionExpired).not.toHaveBeenCalled();
  });
});
