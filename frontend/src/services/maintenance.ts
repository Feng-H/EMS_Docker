import api from './api';

export interface MaintenanceItem {
  id?: number;
  name: string;
  itemType: 'qualitative' | 'quantitative';
  qualitativeOptions?: {
    normal: string;
    abnormal: string;
  };
  quantitativeSettings?: {
    unit: string;
    minValue?: number;
    maxValue?: number;
  };
  sortOrder?: number;
  description?: string;
}

export interface MaintenancePlan {
  id: number;
  title: string;
  description?: string;
  frequencyType: string;
  frequencyValue: number;
  nextDueAt?: string;
  assignedGroupId?: number;
  assignedTo?: number;
  assignee?: any;
  active: boolean;
  items?: MaintenanceItem[];
  devices?: any[]; // 绑定的设备列表
}

export interface MaintenanceTask {
  id: number;
  planId?: number;
  plan?: MaintenancePlan;
  deviceId: number;
  device?: any;
  scheduledAt: string;
  assignedTo?: number;
  assignee?: any;
  status: string;
  startedAt?: string;
  finishedAt?: string;
  result?: Record<string, any>;
  hasAbnormal?: boolean;
  abnormalWorkOrderId?: number;
  attachments?: string[];
  notes?: string;
}

export const maintenanceService = {
  getPlans(params?: { page?: number; limit?: number; search?: string }): Promise<{ data: MaintenancePlan[]; total: number }> {
    return api.get('/maintenance/plans', { params });
  },
  getPlanById(id: number): Promise<MaintenancePlan> {
    return api.get(`/maintenance/plans/${id}`);
  },
  createPlan(data: Partial<MaintenancePlan>): Promise<MaintenancePlan> {
    return api.post('/maintenance/plans', data);
  },
  updatePlan(id: number, data: Partial<MaintenancePlan>): Promise<MaintenancePlan> {
    return api.patch(`/maintenance/plans/${id}`, data);
  },
  deletePlan(id: number): Promise<void> {
    return api.delete(`/maintenance/plans/${id}`);
  },
  getTasks(params?: { page?: number; limit?: number; status?: string; search?: string }): Promise<{ data: MaintenanceTask[]; total: number }> {
    return api.get('/maintenance/tasks', { params });
  },
  getTaskById(id: number): Promise<MaintenanceTask> {
    return api.get(`/maintenance/tasks/${id}`);
  },
  submitTask(taskId: number, data: {
    results: Record<string, { type: 'qualitative' | 'quantitative'; value: string | number; status: 'normal' | 'abnormal' }>;
    notes?: string;
    attachments?: string[];
  }): Promise<MaintenanceTask> {
    return api.post(`/maintenance/tasks/${taskId}/submit`, data);
  },
  bindDevices(planId: number, deviceIds: number[]): Promise<void> {
    return api.post(`/maintenance/plans/${planId}/bind-devices`, { deviceIds });
  },
  getPlanDevices(planId: number): Promise<any[]> {
    return api.get(`/maintenance/plans/${planId}/devices`);
  },
  generateTasks(planId: number, data?: { scheduledAt?: string; deviceIds?: number[] }): Promise<MaintenanceTask[]> {
    return api.post(`/maintenance/plans/${planId}/generate-tasks`, data || {});
  },
  getStatistics(): Promise<any> {
    return api.get('/maintenance/statistics');
  },
};

