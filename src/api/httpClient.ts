import axios, { type AxiosRequestConfig, type InternalAxiosRequestConfig } from 'axios';

type InternalConfig = InternalAxiosRequestConfig & { skipAuth?: boolean };
export interface AuthenticatedRequestConfig extends AxiosRequestConfig {
  skipAuth?: boolean;
}

const rawBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api';
const sanitizedBaseUrl = rawBaseUrl.replace(/\/+$/, '');

export const httpClient = axios.create({
  baseURL: sanitizedBaseUrl,
});

let accessToken: string | null = null;
let unauthorizedHandler: (() => void | Promise<void>) | null = null;

export const setAccessToken = (token: string | null) => {
  accessToken = token;
};

export const setUnauthorizedHandler = (handler: (() => void | Promise<void>) | null) => {
  unauthorizedHandler = handler;
};

httpClient.interceptors.request.use((config) => {
  const request = config as InternalConfig;
  if (!request.skipAuth && accessToken) {
    request.headers = request.headers ?? {};
    request.headers.Authorization = `Bearer ${accessToken}`;
  }
  return request;
});

httpClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (axios.isAxiosError(error) && error.response?.status === 401 && unauthorizedHandler) {
      await unauthorizedHandler();
    }
    return Promise.reject(error);
  },
);

export const withoutAuth = (config: AuthenticatedRequestConfig = {}) => ({ ...config, skipAuth: true });
