import api from './api';

export interface WorkOrder {
  id: number;
  orderNo: string;
  reporterId?: number;
  reporter?: any;
  deviceId?: number;
  device?: any;
  title: string;
  description?: string;
  priority: string;
  status: string;
  assignedTo?: number;
  assignee?: any;
  startedAt?: string;
  finishedAt?: string;
  acceptedAt?: string;
  reportedAt?: string; // 报修时间
  responseTime?: number; // 响应时间（分钟）
  repairTime?: number; // 维修时间（分钟）
  attachments?: string[];
  faultCategory?: string;
  faultCause?: string;
  solution?: string;
}

export const workOrderService = {
  getList(params?: { page?: number; limit?: number; status?: string; priority?: string; search?: string }): Promise<{ data: WorkOrder[]; total: number }> {
    return api.get('/work-orders', { params });
  },
  getById(id: number): Promise<WorkOrder> {
    return api.get(`/work-orders/${id}`);
  },
  create(data: Partial<WorkOrder>): Promise<WorkOrder> {
    return api.post('/work-orders', data);
  },
  update(id: number, data: Partial<WorkOrder>): Promise<WorkOrder> {
    return api.patch(`/work-orders/${id}`, data);
  },
  assign(id: number, userId: number): Promise<WorkOrder> {
    return api.post(`/work-orders/${id}/assign`, { userId });
  },
  delete(id: number): Promise<void> {
    return api.delete(`/work-orders/${id}`);
  },
  useSpareParts(id: number, spareParts: { partId: number; qty: number }[]): Promise<void> {
    return api.post(`/work-orders/${id}/use-spare-parts`, { spareParts });
  },
  getParts(id: number): Promise<any[]> {
    return api.get(`/work-orders/${id}/parts`);
  },
  getStatistics(): Promise<any> {
    return api.get('/work-orders/statistics');
  },
  export(): Promise<void> {
    return new Promise((resolve, reject) => {
      // 动态导入避免循环依赖
      import('@/store/auth').then(({ useAuthStore }) => {
        const authStore = useAuthStore();
        const token = authStore.token;
      if (!token) {
        reject(new Error('未登录，请先登录'));
        return;
      }

      fetch(`${import.meta.env.VITE_API_BASE_URL || '/api'}/work-orders/export`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })
        .then(async (response) => {
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: '导出失败' }));
            throw new Error(errorData.message || '导出失败');
          }
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          const contentDisposition = response.headers.get('Content-Disposition');
          let filename = `工单列表_${new Date().toISOString().split('T')[0]}.xlsx`;
          if (contentDisposition) {
            const filenameMatch = contentDisposition.match(/filename\*=UTF-8''(.+)/);
            if (filenameMatch) {
              filename = decodeURIComponent(filenameMatch[1]);
            }
          }
          link.download = filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
          resolve();
        })
        .catch((error) => {
          reject(error);
        });
      }).catch((error) => {
        reject(new Error('无法加载认证信息: ' + error.message));
      });
    });
  },
};

