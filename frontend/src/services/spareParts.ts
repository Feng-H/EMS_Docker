import api from './api';

export interface SparePart {
  id: number;
  partNo: string;
  name: string;
  spec?: Record<string, any>;
  supplier?: string;
  brand?: string;
  stockQty: number;
  minStock: number;
  unit: string; // 'pc' | 'set' | 'm'
  location?: string;
  imageUrls?: string[];
}

export const sparePartService = {
  getList(params?: { page?: number; limit?: number; search?: string }): Promise<{ data: SparePart[]; total: number }> {
    return api.get('/spare-parts', { params });
  },
  getById(id: number): Promise<SparePart> {
    return api.get(`/spare-parts/${id}`);
  },
  create(data: Partial<SparePart>): Promise<SparePart> {
    return api.post('/spare-parts', data);
  },
  update(id: number, data: Partial<SparePart>): Promise<SparePart> {
    return api.patch(`/spare-parts/${id}`, data);
  },
  delete(id: number): Promise<void> {
    return api.delete(`/spare-parts/${id}`);
  },
  getLowStock(): Promise<SparePart[]> {
    return api.get('/spare-parts/low-stock');
  },
  getOldParts(params?: { page?: number; limit?: number; search?: string }): Promise<{ data: any[]; total: number }> {
    return api.get('/spare-parts/old-parts', { params });
  },
  getStatistics(): Promise<any> {
    return api.get('/spare-parts/statistics');
  },
};

