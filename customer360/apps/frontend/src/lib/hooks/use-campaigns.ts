import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import type { Segment, FilterAST } from './use-segments';

export interface CampaignAnalytics {
  id: string;
  campaignId: string;
  totalSent: number;
  totalDelivered: number;
  totalFailed: number;
  totalOpened: number;
  totalRead: number;
  totalClicked: number;
  totalConverted: number;
  computedAt: string | null;
  aiSummary: string | null;
}

export interface Campaign {
  id: string;
  createdBy: string;
  segmentId: string;
  name: string;
  channel: 'whatsapp' | 'sms' | 'email' | 'rcs';
  messageBody: string;
  subject: string | null;
  ctaText: string | null;
  ctaUrl: string | null;
  status: 'draft' | 'scheduled' | 'running' | 'completed' | 'paused';
  scheduledAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  segment?: Segment;
  analytics?: CampaignAnalytics;
}

export interface AICampaignGenerateResult {
  suggested_segment: {
    description: string;
    filter_ast: FilterAST;
  };
  channel_recommendation: 'whatsapp' | 'sms' | 'email' | 'rcs';
  message: string;
  subject?: string;
  cta_text?: string;
  cta_url?: string;
  reasoning: string;
  estimatedSize: number;
}

export function useCampaigns() {
  return useQuery<Campaign[]>({
    queryKey: ['campaigns'],
    queryFn: () => api.get<Campaign[]>('/campaigns'),
  });
}

export function useCampaign(
  id: string,
  options?: { refetchInterval?: number | false | ((data: any) => number | false | undefined) },
) {
  return useQuery<Campaign>({
    queryKey: ['campaigns', id],
    queryFn: () => api.get<Campaign>(`/campaigns/${id}`),
    enabled: !!id,
    refetchInterval: options?.refetchInterval,
  });
}

export function useCreateCampaign() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      name: string;
      segmentId: string;
      channel: 'whatsapp' | 'sms' | 'email' | 'rcs';
      messageBody: string;
      subject?: string;
      ctaText?: string;
      ctaUrl?: string;
      scheduledAt?: string | Date;
    }) => api.post<Campaign>('/campaigns', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    },
  });
}

export function useLaunchCampaign() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<Campaign>(`/campaigns/${id}/launch`),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['campaigns', id] });
    },
  });
}

export function useAIGenerateCampaign() {
  return useMutation({
    mutationFn: (goal: string) =>
      api.post<AICampaignGenerateResult>('/campaigns/ai-generate', { goal }),
  });
}
