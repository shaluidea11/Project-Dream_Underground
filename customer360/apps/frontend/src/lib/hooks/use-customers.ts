import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';

export interface Customer {
  id: string;
  canonicalName: string;
  email: string | null;
  phone: string | null;
  city: string | null;
  state: string | null;
  preferredChannel: string;
  engagementScore: number;
  lifetimeValue: number;
  totalSpend: number;
  orderCount: number;
  lastOrderAt: string | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  orders?: any[];
  communications?: any[];
  segmentMemberships?: any[];
}

export interface GetCustomersParams {
  page: number;
  limit: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export function useCustomers(params: GetCustomersParams) {
  return useQuery<PaginatedResponse<Customer>>({
    queryKey: ['customers', params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      searchParams.set('page', params.page.toString());
      searchParams.set('limit', params.limit.toString());
      if (params.search) searchParams.set('search', params.search);
      if (params.sortBy) searchParams.set('sortBy', params.sortBy);
      if (params.sortOrder) searchParams.set('sortOrder', params.sortOrder);

      return api.get<PaginatedResponse<Customer>>(`/customers?${searchParams.toString()}`);
    },
  });
}

export function useCustomer(id: string) {
  return useQuery<Customer>({
    queryKey: ['customers', id],
    queryFn: () => api.get<Customer>(`/customers/${id}`),
    enabled: !!id,
  });
}

export function useProfileCustomer() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => api.post<Customer>(`/customers/${id}/profile`),
    onSuccess: (data, id) => {
      queryClient.setQueryData(['customers', id], data);
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });
}
