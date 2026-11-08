import axios from 'axios';

import { env } from '../../config/env';
import type { CitizenAuthResponse, FederatedTokenResponse, FederatedUserInfo } from '../../types/auth';

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
  staffMe(accessToken: string): Promise<FederatedUserInfo> {
    return federatedAuthClient.get<FederatedUserInfo>('/me', { headers: { Authorization: `Bearer ${accessToken}` } }).then((response) => response.data);
  },
  async staffLogout(refreshToken: string): Promise<void> {
    await federatedAuthClient.post('/auth/logout', { refreshToken });
  },
};
