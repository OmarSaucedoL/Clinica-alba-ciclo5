import { create } from 'zustand';

export const useAuthStore = create((set) => ({
  // Ya no leemos 'token' de localStorage, solo el objeto user para la UI
  user: JSON.parse(localStorage.getItem('user')) || null,

  login: (user) => {
    localStorage.setItem('user', JSON.stringify(user));
    set({ user });
  },

  logout: () => {
    localStorage.removeItem('user');
    set({ user: null });
  }
}));