import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getStoredToken, clearStoredTokens } from '@/lib/auth';

interface User {
  id: string;
  email: string;
  fullName: string;
  role: 'ADMIN' | 'RETAILER' | 'SHOP_OWNER';
}

interface AuthState {
  user: User | null;
  token: string | null;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: getStoredToken(),
      setUser: (user) => set({ user }),
      setToken: (token) => set({ token }),
      clearAuth: () => {
        clearStoredTokens();
        set({ user: null, token: null });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ 
        user: state.user,
        // Don't persist token here, it's handled by auth.ts
      }),
    }
  )
);
