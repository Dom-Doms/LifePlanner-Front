import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { login as loginApi, me, register as registerApi } from '@/api/authApi';
import { setAccessToken, setUnauthorizedHandler } from '@/api/httpClient';
import type { LoginRequest, RegisterRequest, UserResponse } from '@/types/api';

const AUTH_STORAGE_KEY = 'life-planner-auth';

interface PersistedAuthState {
  token: string;
  user: UserResponse;
}

const loadPersistedState = (): PersistedAuthState | null => {
  const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PersistedAuthState;
  } catch {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    return null;
  }
};

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(null);
  const user = ref<UserResponse | null>(null);
  const loading = ref(false);

  const isAuthenticated = computed(() => Boolean(token.value && user.value));
  const isAdmin = computed(() => user.value?.role === 'ADMIN');

  const persist = () => {
    if (token.value && user.value) {
      window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ token: token.value, user: user.value }));
      return;
    }
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
  };

  const applySession = (nextToken: string, nextUser: UserResponse) => {
    token.value = nextToken;
    user.value = nextUser;
    setAccessToken(nextToken);
    persist();
  };

  const restoreSession = () => {
    const stored = loadPersistedState();
    if (stored) {
      applySession(stored.token, stored.user);
    }
  };

  const login = async (payload: LoginRequest) => {
    loading.value = true;
    try {
      const response = await loginApi(payload);
      applySession(response.token, response.user);
    } finally {
      loading.value = false;
    }
  };

  const register = async (payload: RegisterRequest) => {
    await registerApi(payload);
  };

  const refreshProfile = async () => {
    user.value = await me();
    persist();
  };

  const logout = () => {
    token.value = null;
    user.value = null;
    setAccessToken(null);
    persist();
  };

  restoreSession();
  setUnauthorizedHandler(logout);

  return { token, user, loading, isAuthenticated, isAdmin, login, register, refreshProfile, logout };
});
