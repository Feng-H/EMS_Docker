import api from './api';

export interface LoginDto {
  username: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  user: {
    id: number;
    username: string;
    name: string;
    role: any;
  };
}

export const authService = {
  login(data: LoginDto): Promise<LoginResponse> {
    return api.post('/auth/login', data);
  },
};
