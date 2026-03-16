import { create } from 'zustand';
import type { User } from 'firebase/auth';

export type UserProfile = {
  full_name: string;
  phone?: string | null;
  country?: string | null;
  role: 'user' | 'admin';
  created_at?: string;
  updated_at?: string;
};

interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setProfile: (profile: UserProfile | null) => void;
  setIsLoading: (isLoading: boolean) => void;
  isAdmin: () => boolean;
  reset: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  isLoading: true,
  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),
  setIsLoading: (isLoading) => set({ isLoading }),
  isAdmin: () => get().profile?.role === 'admin',
  reset: () => set({ user: null, profile: null, isLoading: false }),
}));
