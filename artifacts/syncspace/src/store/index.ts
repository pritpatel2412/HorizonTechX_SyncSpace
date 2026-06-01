import { create } from 'zustand';
import { Socket } from 'socket.io-client';
import { User } from '@workspace/api-client-react';

interface AuthState {
  token: string | null;
  user: User | null;
  setToken: (token: string | null) => void;
  setUser: (user: User | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem('syncspace_token'),
  user: null,
  setToken: (token) => {
    if (token) {
      localStorage.setItem('syncspace_token', token);
    } else {
      localStorage.removeItem('syncspace_token');
    }
    set({ token });
  },
  setUser: (user) => set({ user }),
  logout: () => {
    localStorage.removeItem('syncspace_token');
    set({ token: null, user: null });
  },
}));

interface SocketState {
  socket: Socket | null;
  setSocket: (socket: Socket | null) => void;
}

export const useSocketStore = create<SocketState>((set) => ({
  socket: null,
  setSocket: (socket) => set({ socket }),
}));
