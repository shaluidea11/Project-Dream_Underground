import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AnalyticsService } from './analytics.service';

@Controller('analytics')
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  // ═══════════════════════════════════════════════════════════
  // ROUTE ORDER MATTERS: dashboard and channels MUST be before :campaignId
  // ═══════════════════════════════════════════════════════════

  @Get('dashboard')
  async getDashboardHome() {
    return this.analyticsService.getDashboardHome();
  }

  @Get('channels')
  async getChannelComparison() {
    return this.analyticsService.getChannelComparison();
  }

  @Get(':campaignId')
  async getCampaignAnalytics(@Param('campaignId') campaignId: string) {
    return this.analyticsService.getCampaignAnalytics(campaignId);
  }

  @Get(':campaignId/timeseries')
  async getCampaignTimeseries(@Param('campaignId') campaignId: string) {
    return this.analyticsService.getCampaignTimeseries(campaignId);
  }
}
