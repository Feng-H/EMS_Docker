import api from './api';
import { useAuthStore } from '@/store/auth';

export interface Device {
  id: number;
  assetNo: string;
  name: string;
  model?: string;
  brand?: string;
  workshopId?: number;
  workshop?: any;
  location?: string;
  status: string;
  purchaseDate?: string;
  warrantyUntil?: string;
  spec?: Record<string, any>;
  imageUrls?: string[];
  attachments?: any[];
  createdBy?: number;
  creator?: any;
  created_at: string;
  updated_at: string;
}

export interface CreateDeviceDto {
  assetNo: string;
  name: string;
  model?: string;
  brand?: string;
  workshopId?: number;
  location?: string;
  status?: string;
  purchaseDate?: string;
  warrantyUntil?: string;
  spec?: Record<string, any>;
  imageUrls?: string[];
}

export interface DeviceListResponse {
  data: Device[];
  total: number;
}

export const deviceService = {
  getList(params?: { page?: number; limit?: number; search?: string; status?: string }): Promise<DeviceListResponse> {
    return api.get('/devices', { params });
  },
  getById(id: number): Promise<Device> {
    return api.get(`/devices/${id}`);
  },
  create(data: CreateDeviceDto): Promise<Device> {
    return api.post('/devices', data);
  },
  update(id: number, data: Partial<CreateDeviceDto>): Promise<Device> {
    return api.patch(`/devices/${id}`, data);
  },
  delete(id: number): Promise<void> {
    return api.delete(`/devices/${id}`);
  },
  getStatistics(): Promise<any> {
    return api.get('/devices/statistics');
  },
  import(file: File): Promise<{ success: number; failed: number; errors: any[] }> {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/devices/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }) as Promise<{ success: number; failed: number; errors: any[] }>;
  },
  export(): Promise<void> {
    return new Promise((resolve, reject) => {
      const authStore = useAuthStore();
      const token = authStore.token;
      if (!token) {
        reject(new Error('未登录，请先登录'));
        return;
      }
      
      const url = `${import.meta.env.VITE_API_BASE_URL || '/api'}/devices/export`;
      
      fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
        .then(async response => {
          if (!response.ok) {
            let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
            try {
              const errorData = await response.json();
              errorMessage = errorData.message || errorMessage;
            } catch {
              // 如果不是 JSON，使用默认错误信息
            }
            return Promise.reject(new Error(errorMessage));
          }
          return response.blob();
        })
        .then(blob => {
          if (!blob || blob.size === 0) {
            reject(new Error('下载的文件为空'));
            return;
          }
          
          try {
            const downloadUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = `设备列表_${new Date().toISOString().split('T')[0]}.xlsx`;
            link.style.display = 'none';
            
            document.body.appendChild(link);
            
            setTimeout(() => {
              try {
                link.click();
              } catch (clickError: any) {
                console.warn('直接点击失败，尝试备用方法:', clickError);
                window.open(downloadUrl, '_blank');
              }
              
              setTimeout(() => {
                document.body.removeChild(link);
                window.URL.revokeObjectURL(downloadUrl);
              }, 100);
            }, 0);
            
            resolve();
          } catch (downloadError: any) {
            console.warn('创建下载链接失败，尝试直接打开:', downloadError);
            const downloadUrl = window.URL.createObjectURL(blob);
            window.open(downloadUrl, '_blank');
            setTimeout(() => window.URL.revokeObjectURL(downloadUrl), 1000);
            resolve();
          }
        })
        .catch(error => {
          console.error('导出失败:', error);
          if (error?.message?.includes('runtime.lastError') || 
              error?.message?.includes('devtools')) {
            console.warn('浏览器扩展可能干扰了下载，但这不影响功能');
            resolve();
          } else {
            reject(error);
          }
        });
    });
  },
  downloadTemplate(): Promise<void> {
    return new Promise(async (resolve, reject) => {
      try {
        const authStore = useAuthStore();
        const token = authStore.token;
        if (!token) {
          reject(new Error('未登录，请先登录'));
          return;
        }
        
        const url = `${import.meta.env.VITE_API_BASE_URL || '/api'}/devices/template`;
        console.log('开始下载模板，URL:', url);
        
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        
        console.log('响应状态:', response.status, response.statusText);
        
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
        console.log('Blob 大小:', blob.size, '类型:', blob.type);
        
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
        link.download = '设备导入模板.xlsx';
        link.style.display = 'none';
        
        document.body.appendChild(link);
        console.log('触发下载...');
        
        // 使用同步方式触发
        link.click();
        
        // 延迟清理
        setTimeout(() => {
          document.body.removeChild(link);
          URL.revokeObjectURL(downloadUrl);
          console.log('下载完成');
          resolve();
        }, 100);
      } catch (error: any) {
        console.error('下载模板失败:', error);
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

