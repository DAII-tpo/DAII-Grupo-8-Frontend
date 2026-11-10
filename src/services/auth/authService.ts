import axios from 'axios';

import { env } from '../../config/env';
import type { CitizenAuthResponse, CurrentUserResponse, FederatedTokenResponse } from '../../types/auth';
import { httpClient } from '../http/httpClient';

const citizenAuthClient = axios.create({ baseURL: env.apiBaseUrl });
const federatedAuthClient = axios.create({ baseURL: env.federatedAuthBaseUrl });

export const authService = {
  citizenLogin(email: string, password: string): Promise<CitizenAuthResponse> {
    return citizenAuthClient.post<CitizenAuthResponse>('/api/v1/auth/login', { email, password }).then((response) => response.data);
  },
  citizenRegister(email: string, password: string, firstName: string, lastName: string): Promise<CitizenAuthResponse> {
    return citizenAuthClient.post<CitizenAuthResponse>('/api/v1/auth/register', { email, password, firstName, lastName }).then((response) => response.data);
  },
  citizenRefresh(refreshToken: string): Promise<CitizenAuthResponse> {
    return citizenAuthClient.post<CitizenAuthResponse>('/api/v1/auth/refresh', { refreshToken }).then((response) => response.data);
  },
  staffLogin(username: string, password: string): Promise<FederatedTokenResponse> {
    return federatedAuthClient.post<FederatedTokenResponse>('/auth/login', { username, password, clientId: env.federatedClientId }).then((response) => response.data);
  },
  staffRefresh(refreshToken: string): Promise<FederatedTokenResponse> {
    return federatedAuthClient.post<FederatedTokenResponse>('/auth/refresh', { refreshToken }).then((response) => response.data);
  },
  /**
   * Identidad y rol según el backend, que es la única fuente del rol. El token va explícito y sin
   * el refresh automático del interceptor: se usa justo después de obtener un par nuevo.
   */
  currentUser(accessToken: string): Promise<CurrentUserResponse> {
    return httpClient.get<CurrentUserResponse>('/api/v1/users/me', { skipAuth: true, headers: { Authorization: `Bearer ${accessToken}` } }).then((response) => response.data);
  },
  async staffLogout(refreshToken: string): Promise<void> {
    await federatedAuthClient.post('/auth/logout', { refreshToken });
  },
};
