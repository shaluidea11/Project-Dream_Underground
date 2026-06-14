import { Controller, Get, Post, Patch, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AgentWorkflowService } from './agent-workflow.service';
import { TrendAgentService } from './trend-agent.service';

@Controller('agents')
@UseGuards(JwtAuthGuard)
export class AgentsController {
  constructor(
    private readonly workflowService: AgentWorkflowService,
    private readonly trendService: TrendAgentService,
  ) {}

  @Post('trend/trigger')
  async triggerTrendScan() {
    const result = await this.workflowService.runWorkflow({ task: 'trend' });
    return result.trends;
  }

  @Get('trend/insights')
  async getTrendInsights() {
    return this.trendService.findAll();
  }

  @Get('trend/unread-count')
  async getUnreadCount() {
    const count = await this.trendService.findUnreadCount();
    return { count };
  }

  @Patch('trend/insights/:id/read')
  async markRead(@Param('id') id: string) {
    return this.trendService.markRead(id);
  }

  @Post('campaign/trigger-analysis/:campaignId')
  async triggerCampaignAnalysis(@Param('campaignId') campaignId: string) {
    const result = await this.workflowService.runWorkflow({
      task: 'analytics',
      campaignId,
    });
    return { report: result.analyticsReport };
  }
}
