'use client';

import { create } from 'zustand';
import Cookies from 'js-cookie';
import { api } from './api';

export type Role = 'ADMIN' | 'DATA_MANAGER' | 'CLIENT';

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  companyName?: string | null;
  mfaEnabled: boolean;
  lastLoginAt?: string | null;
  createdAt?: string;
}

interface AuthState {
  user: User | null;
  loading: boolean;
  hydrate: () => Promise<void>;
  login: (email: string, password: string, mfaCode?: string) => Promise<User>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  loading: true,

  hydrate: async () => {
    if (!Cookies.get('access_token')) {
      set({ loading: false });
      return;
    }
    try {
      const { data } = await api.get<User>('/auth/me');
      set({ user: data, loading: false });
    } catch {
      Cookies.remove('access_token');
      Cookies.remove('refresh_token');
      set({ user: null, loading: false });
    }
  },

  login: async (email, password, mfaCode) => {
    const { data } = await api.post('/auth/login', { email, password, mfaCode });
    Cookies.set('access_token', data.accessToken, { sameSite: 'lax' });
    Cookies.set('refresh_token', data.refreshToken, { sameSite: 'lax' });
    set({ user: data.user });
    return data.user;
  },

  logout: async () => {
    try { await api.post('/auth/logout'); } catch {}
    Cookies.remove('access_token');
    Cookies.remove('refresh_token');
    set({ user: null });
  },

  refreshUser: async () => {
    try {
      const { data } = await api.get<User>('/auth/me');
      set({ user: data });
    } catch {}
  },
}));
