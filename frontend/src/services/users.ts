import api from './api';

export interface User {
  id: number;
  username: string;
  name: string;
  employeeNo?: string;
  phone?: string;
  email?: string;
  roleId?: number;
  role?: any;
  departmentId?: number;
  department?: any;
  isActive: boolean;
}

export interface CreateUserDto {
  username: string;
  name: string;
  employeeNo: string;
  password?: string;
  phone?: string;
  email?: string;
  roleId?: number;
  departmentId?: number;
  isActive?: boolean;
}

export interface UpdateUserDto {
  username?: string;
  name?: string;
  employeeNo?: string;
  phone?: string;
  email?: string;
  roleId?: number;
  departmentId?: number;
  isActive?: boolean;
}

export interface ChangePasswordDto {
  oldPassword: string;
  newPassword: string;
}

export const userService = {
  getList(params?: { page?: number; limit?: number; search?: string }): Promise<{ data: User[]; total: number }> {
    return api.get('/users', { params });
  },
  getById(id: number): Promise<User> {
    return api.get(`/users/${id}`);
  },
  getStatistics(): Promise<any> {
    return api.get('/users/statistics');
  },
  getRoles(): Promise<any[]> {
    return api.get('/users/roles');
  },
  create(data: CreateUserDto): Promise<User> {
    return api.post('/users', data);
  },
  update(id: number, data: UpdateUserDto): Promise<User> {
    return api.patch(`/users/${id}`, data);
  },
  delete(id: number): Promise<void> {
    return api.delete(`/users/${id}`);
  },
  changePassword(id: number, data: ChangePasswordDto): Promise<void> {
    return api.post(`/users/${id}/change-password`, data);
  },
  import(file: File): Promise<{ success: number; failed: number; errors: any[] }> {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/users/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  downloadTemplate(): Promise<void> {
    return new Promise(async (resolve, reject) => {
      try {
        const { useAuthStore } = await import('@/store/auth');
        const authStore = useAuthStore();
        const token = authStore.token;
        if (!token) {
          reject(new Error('未登录，请先登录'));
          return;
        }
        
        const url = `${import.meta.env.VITE_API_BASE_URL || '/api'}/users/template`;
        
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
          try {
            const errorData = JSON.parse(errorText);
            errorMessage = errorData.message || errorMessage;
          } catch {
            errorMessage = errorText || errorMessage;
          }
          throw new Error(errorMessage);
        }
        
        const blob = await response.blob();
        
        if (!blob || blob.size === 0) {
          throw new Error('下载的文件为空');
        }
        
        // 检查是否是 JSON 错误响应
        if (blob.type && blob.type.includes('application/json')) {
          const text = await blob.text();
          const errorData = JSON.parse(text);
          throw new Error(errorData.message || '服务器返回错误');
        }
        
        // 创建下载链接并触发下载
        const downloadUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        
        // 从响应头获取文件名
        const contentDisposition = response.headers.get('Content-Disposition');
        let filename = '人员导入模板.xlsx';
        if (contentDisposition) {
          const filenameMatch = contentDisposition.match(/filename\*=UTF-8''(.+)/);
          if (filenameMatch) {
            filename = decodeURIComponent(filenameMatch[1]);
          }
        }
        link.download = filename;
        link.style.display = 'none';
        
        document.body.appendChild(link);
        
        // 使用同步方式触发
        link.click();
        
        // 延迟清理
        setTimeout(() => {
          document.body.removeChild(link);
          URL.revokeObjectURL(downloadUrl);
          resolve();
        }, 100);
      } catch (error: any) {
        // 忽略浏览器扩展错误
        if (error?.message?.includes('runtime.lastError') || 
            error?.message?.includes('devtools')) {
          console.warn('浏览器扩展可能干扰了下载，但文件可能已下载');
          resolve();
        } else {
          reject(error);
        }
      }
    });
  },
};

