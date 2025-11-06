import api from './api';

export interface Workshop {
  id: number;
  code: string;
  name: string;
  description?: string;
  address?: string;
  isActive: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface CreateWorkshopDto {
  code: string;
  name: string;
  description?: string;
  address?: string;
  isActive?: boolean;
}

export const workshopService = {
  getList(params?: { page?: number; limit?: number; search?: string }): Promise<{ data: Workshop[]; total: number }> {
    return api.get('/workshops', { params });
  },
  getActiveList(): Promise<Workshop[]> {
    return api.get('/workshops/active');
  },
  getById(id: number): Promise<Workshop> {
    return api.get(`/workshops/${id}`);
  },
  create(data: CreateWorkshopDto): Promise<Workshop> {
    return api.post('/workshops', data);
  },
  update(id: number, data: Partial<CreateWorkshopDto>): Promise<Workshop> {
    return api.patch(`/workshops/${id}`, data);
  },
  delete(id: number): Promise<void> {
    return api.delete(`/workshops/${id}`);
  },
};

