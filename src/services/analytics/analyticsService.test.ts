import type { InternalAxiosRequestConfig } from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { configureHttpAuth, httpClient } from '../http/httpClient';
import { analyticsService } from './analyticsService';

const originalAdapter = httpClient.defaults.adapter;
let data: string;
let contentType: string | undefined;
let requests: InternalAxiosRequestConfig[];
beforeEach(() => {
  data = '{"status":"ok"}'; contentType = 'application/json'; requests = [];
  configureHttpAuth({ getAccessToken: () => 'human-admin-test', refresh: vi.fn(), onSessionExpired: vi.fn() });
  httpClient.defaults.adapter = async (config) => {
    requests.push(config);
    return { data, headers: { 'content-type': contentType }, status: 200, statusText: 'OK', config };
  };
});
afterEach(() => { configureHttpAuth(null); httpClient.defaults.adapter = originalAdapter; });

describe('analyticsService', () => {
  it('consulta solo el backend propio con el JWT humano y sin parámetros de namespace', async () => {
    const signal = new AbortController().signal;
    await expect(analyticsService.embed(signal)).resolves.toEqual({ status: 'connected' });
    expect(requests[0].url).toBe('/api/v1/admin/analytics/embed');
    expect(requests[0].headers.Authorization).toBe('Bearer human-admin-test');
    expect(requests[0].params).toBeUndefined();
    expect(requests[0].signal).toBe(signal);
    expect(requests[0].headers['Cache-Control']).toBe('no-store');
  });
  it('status ok confirma conexión y no conserva campos adicionales', async () => {
    data = '{"status":"ok","access_token":"not-for-browser"}';
    await expect(analyticsService.embed()).resolves.toEqual({ status: 'connected' });
  });
  it('reconoce el HTML real por su tipo sin convertir el JSON en dashboard', async () => {
    data = '<html><body>BI</body></html>'; contentType = 'text/html; charset=utf-8';
    await expect(analyticsService.embed()).resolves.toEqual({ status: 'ready', html: data });
  });
  it.each(['{}', '{"status":"pending"}', 'null', 'not-json'])('rechaza JSON incompatible: %s', async (body) => {
    data = body;
    await expect(analyticsService.embed()).rejects.toThrow();
  });
  it('rechaza texto o un JSON etiquetado erróneamente como HTML', async () => {
    contentType = 'text/html';
    await expect(analyticsService.embed()).rejects.toThrow('compatible');
  });
  it('no presenta un tipo de respuesta desconocido', async () => {
    contentType = 'text/plain';
    await expect(analyticsService.embed()).rejects.toThrow('compatible');
  });
  it('rechaza una respuesta sin Content-Type', async () => {
    contentType = undefined;
    await expect(analyticsService.embed()).rejects.toThrow('compatible');
  });
});
