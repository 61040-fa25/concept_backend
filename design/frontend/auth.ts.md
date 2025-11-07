store/auth.ts is implemented as follows:
```
import { defineStore } from 'pinia';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    username: (localStorage.getItem('username') ?? '') as string
  }),
  getters: {
    isLoggedIn: (state) => Boolean(state.username)
  },
  actions: {
    setUsername(name: string) {
      this.username = name;
      localStorage.setItem('username', name);
    },
    clear() {
      this.username = '';
      localStorage.removeItem('username');
    }
  }
});
```