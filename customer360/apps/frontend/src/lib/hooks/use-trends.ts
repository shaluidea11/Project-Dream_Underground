import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';

export interface TrendInsightResponse {
  id: string;
  title: string;
  insight: string;
  suggestedSegment: {
    name: string;
    description: string;
    filter_ast: any;
  } | null;
  suggestedChannel: 'whatsapp' | 'sms' | 'email' | 'rcs';
  suggestedMessage: string | null;
  isRead: boolean;
  createdAt: string;
}

export function useTrends() {
  return useQuery<TrendInsightResponse[]>({
    queryKey: ['trends', 'list'],
    queryFn: () => api.get<TrendInsightResponse[]>('/agents/trend/insights'),
  });
}

export function useTrendsUnreadCount() {
  return useQuery<{ count: number }>({
    queryKey: ['trends', 'unread-count'],
    queryFn: () => api.get<{ count: number }>('/agents/trend/unread-count'),
    refetchInterval: 15000, // Poll unread trends count every 15s
  });
}

export function useMarkTrendRead() {
  const queryClient = useQueryClient();
  return useMutation<TrendInsightResponse, Error, string>({
    mutationFn: (id: string) => api.patch<TrendInsightResponse>(`/agents/trend/insights/${id}/read`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trends', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['trends', 'unread-count'] });
    },
  });
}

export function useTriggerTrends() {
  const queryClient = useQueryClient();
  return useMutation<TrendInsightResponse[], Error, void>({
    mutationFn: () => api.post<TrendInsightResponse[]>('/agents/trend/trigger', {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trends', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['trends', 'unread-count'] });
    },
  });
}

export function useTriggerCampaignAnalysis() {
  const queryClient = useQueryClient();
  return useMutation<{ report: string }, Error, string>({
    mutationFn: (campaignId: string) => api.post<{ report: string }>(`/agents/campaign/trigger-analysis/${campaignId}`, {}),
    onSuccess: (_, campaignId) => {
      queryClient.invalidateQueries({ queryKey: ['analytics', 'campaign', campaignId] });
    },
  });
}
