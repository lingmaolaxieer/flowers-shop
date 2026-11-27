import { defineStore } from 'pinia';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: localStorage.getItem('token') ?? '',
    currentIdentity: JSON.parse(localStorage.getItem('currentIdentity') ?? 'null'),
  }),
  actions: {
    setToken(token: string): void {
      this.token = token;
      localStorage.setItem('token', token);
    },
    logout(): void {
      this.token = '';
      this.currentIdentity = null;
      localStorage.clear();
    },
  },
});
