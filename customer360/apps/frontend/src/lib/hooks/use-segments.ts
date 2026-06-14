import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import type { Customer } from './use-customers';

export interface FilterCondition {
  field: string;
  op: string;
  value: string | number;
}

export interface FilterAST {
  logic: 'AND' | 'OR';
  conditions: FilterCondition[];
}

export interface Segment {
  id: string;
  createdBy: string;
  name: string;
  description: string | null;
  filterDefinition: FilterAST;
  nlQuery: string | null;
  customerCount: number;
  lastComputedAt: string | null;
  createdAt: string;
}

export interface AIGenerateResult {
  filterDefinition: FilterAST;
  previewCount: number;
  nlQuery: string;
}

export interface SegmentMembersResponse {
  segment: Segment;
  items: Customer[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export function useSegments() {
  return useQuery<Segment[]>({
    queryKey: ['segments'],
    queryFn: () => api.get<Segment[]>('/segments'),
  });
}

export function useSegment(id: string) {
  return useQuery<Segment>({
    queryKey: ['segments', id],
    queryFn: () => api.get<Segment>(`/segments/${id}`),
    enabled: !!id,
  });
}

export function useSegmentMembers(id: string, page = 1, limit = 20) {
  return useQuery<SegmentMembersResponse>({
    queryKey: ['segments', id, 'members', page],
    queryFn: () =>
      api.get<SegmentMembersResponse>(
        `/segments/${id}/members?page=${page}&limit=${limit}`,
      ),
    enabled: !!id,
  });
}

export function useCreateSegment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      name: string;
      description?: string;
      filterDefinition: FilterAST;
      nlQuery?: string;
    }) => api.post<Segment>('/segments', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['segments'] });
    },
  });
}

export function useAIGenerateSegment() {
  return useMutation({
    mutationFn: (nlQuery: string) =>
      api.post<AIGenerateResult>('/segments/ai-generate', { nlQuery }),
  });
}

export function useRecomputeSegment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post(`/segments/${id}/recompute`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['segments'] });
    },
  });
}
