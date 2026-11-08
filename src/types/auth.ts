export type AuthUser = CitizenUser | StaffUser;

export type CitizenUser = {
  type: 'CITIZEN';
  userId: number;
  email: string;
  firstName: string;
  lastName: string;
  role: 'USER';
};

export type StaffUser = {
  type: 'STAFF';
  userId: null;
  role: 'STAFF';
  uid: string;
  employeeNumber: string;
  fullName: string;
  email: string;
  module: string;
  groups: string[];
};

export type AuthSession = {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
};

export type CitizenAuthResponse = {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  refreshToken: string;
  userId: number;
  email: string;
  firstName: string;
  lastName: string;
  role: 'USER';
};

export type FederatedTokenResponse = {
  access_token: string;
  refresh_token: string;
  token_type: 'Bearer';
  expires_in: number;
};

export type FederatedUserInfo = {
  uid: string;
  employeeNumber: string;
  fullName: string;
  email: string;
  module: string;
  groups: string[];
};

export function canAccessAdministration(user: AuthUser | null): boolean {
  return user?.type === 'STAFF' && user.module === 'movilidad' && user.groups.some((group) => group === 'admin' || group === 'delegados');
}

export function getDisplayName(user: AuthUser | null): string {
  if (!user) return 'Usuario';
  return user.type === 'STAFF' ? user.fullName : `${user.firstName} ${user.lastName}`;
}
