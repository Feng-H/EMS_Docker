import api from './api';

export interface Location {
  id: number;
  name: string;
  type: string; // 'department', 'workshop', 'location'
  parentId?: number;
  parent?: Location;
  children?: Location[];
  description?: string;
  created_at?: string;
  updated_at?: string;
}

export const locationService = {
  getList(type?: string): Promise<Location[]> {
    return api.get('/users/locations/list', { params: type ? { type } : {} });
  },
  getTree(): Promise<Location[]> {
    return api.get('/users/locations/tree');
  },
};

