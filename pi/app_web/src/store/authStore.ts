import { create } from 'zustand';
import { AuthUser } from '../types';

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  setCredentials: (token: string, user: AuthUser) => void;
  clearAuth: () => void;
}

const storedToken = localStorage.getItem('iotinel_token');
const storedUser = localStorage.getItem('iotinel_user');

export const useAuthStore = create<AuthState>((set) => ({
  token: storedToken,
  user: storedUser ? JSON.parse(storedUser) : null,
  setCredentials: (token, user) => {
    localStorage.setItem('iotinel_token', token);
    localStorage.setItem('iotinel_user', JSON.stringify(user));
    set({ token, user });
  },
  clearAuth: () => {
    localStorage.removeItem('iotinel_token');
    localStorage.removeItem('iotinel_user');
    set({ token: null, user: null });
  }
}));
