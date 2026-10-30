import { afterEach, describe, expect, it, vi } from 'vitest';

import { getBrowserLocation, tryGetBrowserLocation } from './browserLocation';

const getCurrentPosition = vi.fn<(success: PositionCallback, error?: PositionErrorCallback | null) => void>();

function withGeolocation(value: unknown) {
  Object.defineProperty(navigator, 'geolocation', { configurable: true, value });
}

afterEach(() => {
  vi.clearAllMocks();
  withGeolocation(undefined);
});

describe('browserLocation', () => {
  it('devuelve la ubicación y la precisión del navegador', async () => {
    withGeolocation({ getCurrentPosition });
    getCurrentPosition.mockImplementationOnce((success) => success({
      coords: { latitude: -34.6037, longitude: -58.3816, accuracy: 15 },
    } as GeolocationPosition));

    await expect(getBrowserLocation()).resolves.toEqual({ latitude: -34.6037, longitude: -58.3816, accuracyMeters: 15 });
  });

  it('rechaza sin geolocalización, pero la versión opcional devuelve null', async () => {
    withGeolocation(undefined);

    await expect(getBrowserLocation()).rejects.toThrow('geolocation-unavailable');
    await expect(tryGetBrowserLocation()).resolves.toBeNull();
  });

  it('si el usuario no la permite, la versión opcional devuelve null', async () => {
    withGeolocation({ getCurrentPosition });
    getCurrentPosition.mockImplementationOnce((_success, error) => error?.({ code: 1 } as GeolocationPositionError));

    await expect(tryGetBrowserLocation()).resolves.toBeNull();
  });
});
