import { httpClient } from './httpClient';
import type { UserResponse } from '@/types/api';

export const searchUsers = async (query: string) => {
  const { data } = await httpClient.get<UserResponse[]>('/users/search', { params: { q: query } });
  return data;
};
