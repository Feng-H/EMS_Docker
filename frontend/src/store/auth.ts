import { defineStore } from 'pinia';
import { ref } from 'vue';
import { authService, LoginDto } from '@/services/auth';
import router from '@/router';

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem('token'));
  const user = ref<any>(null);

  const login = async (data: LoginDto) => {
    const response = await authService.login(data);
    token.value = response.access_token;
    user.value = response.user;
    localStorage.setItem('token', response.access_token);
    localStorage.setItem('user', JSON.stringify(response.user));
    router.push('/');
  };

  const logout = () => {
    token.value = null;
    user.value = null;
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  const initUser = () => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      user.value = JSON.parse(userStr);
    }
  };

  return {
    token,
    user,
    login,
    logout,
    initUser,
  };
});
