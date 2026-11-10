export type BrowserLocation = {
  latitude: number;
  longitude: number;
  accuracyMeters: number | null;
};

/** Ubicación actual del navegador. Rechaza si no hay geolocalización, el usuario no la permite o no llega a tiempo. */
export function getBrowserLocation(timeoutMs = 10_000): Promise<BrowserLocation> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('geolocation-unavailable'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracyMeters: Number.isFinite(position.coords.accuracy) ? position.coords.accuracy : null,
      }),
      reject,
      { enableHighAccuracy: true, maximumAge: 30_000, timeout: timeoutMs },
    );
  });
}

/** Igual que getBrowserLocation, pero para datos opcionales: si no se puede obtener, devuelve null. */
export function tryGetBrowserLocation(timeoutMs = 5_000): Promise<BrowserLocation | null> {
  return getBrowserLocation(timeoutMs).catch(() => null);
}
