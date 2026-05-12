import { httpClient, withoutAuth } from './httpClient';
import type { AuthResponse, LoginRequest, RegisterRequest, UserResponse } from '@/types/api';

export const login = async (payload: LoginRequest) => {
  const { data } = await httpClient.post<AuthResponse>('/auth/login', payload, withoutAuth());
  return data;
};

export const register = async (payload: RegisterRequest) => {
  const { data } = await httpClient.post<UserResponse>('/auth/register', payload, withoutAuth());
  return data;
};

export const me = async () => {
  const { data } = await httpClient.get<UserResponse>('/auth/me');
  return data;
};
