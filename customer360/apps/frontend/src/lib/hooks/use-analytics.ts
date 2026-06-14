import { useQuery } from '@tanstack/react-query';
import { api } from '../api';

export interface DashboardHomeMetrics {
  totalCustomers: number;
  totalSegments: number;
  campaignsThisMonth: number;
  bestCampaign: {
    id: string;
    name: string;
    conversionRate: number;
  } | null;
}

export interface CampaignAnalyticsResponse {
  campaign: {
    id: string;
    name: string;
    channel: string;
    status: string;
  };
  metrics: {
    totalSent: number;
    totalDelivered: number;
    totalFailed: number;
    totalOpened: number;
    totalRead: number;
    totalClicked: number;
    totalConverted: number;
    deliveryRate: number;
    openRate: number;
    clickRate: number;
    conversionRate: number;
  };
}

export interface TimeseriesPoint {
  timestamp: string;
  delivered: number;
  opened: number;
  clicked: number;
  converted: number;
}

export interface ChannelMetric {
  channel: string;
  totalSent: number;
  totalDelivered: number;
  totalOpened: number;
  totalClicked: number;
  totalConverted: number;
  deliveryRate: number;
  openRate: number;
  clickRate: number;
  conversionRate: number;
}

export function useDashboardHome() {
  return useQuery<DashboardHomeMetrics>({
    queryKey: ['analytics', 'dashboard'],
    queryFn: () => api.get<DashboardHomeMetrics>('/analytics/dashboard'),
  });
}

export function useCampaignAnalytics(campaignId: string, options?: { refetchInterval?: number | false }) {
  return useQuery<CampaignAnalyticsResponse>({
    queryKey: ['analytics', 'campaign', campaignId],
    queryFn: () => api.get<CampaignAnalyticsResponse>(`/analytics/${campaignId}`),
    enabled: !!campaignId,
    refetchInterval: options?.refetchInterval,
  });
}

export function useCampaignTimeseries(campaignId: string) {
  return useQuery<TimeseriesPoint[]>({
    queryKey: ['analytics', 'campaign', campaignId, 'timeseries'],
    queryFn: () => api.get<TimeseriesPoint[]>(`/analytics/${campaignId}/timeseries`),
    enabled: !!campaignId,
  });
}

export function useChannelComparison() {
  return useQuery<ChannelMetric[]>({
    queryKey: ['analytics', 'channels'],
    queryFn: () => api.get<ChannelMetric[]>('/analytics/channels'),
  });
}
