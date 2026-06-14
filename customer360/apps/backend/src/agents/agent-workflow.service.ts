import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { SegmentationAgentService } from './segmentation-agent.service';
import { CampaignAgentService } from './campaign-agent.service';
import { TrendAgentService } from './trend-agent.service';
import { AnalyticsAgentService } from './analytics-agent.service';

@Injectable()
export class AgentWorkflowService {
  private readonly logger = new Logger(AgentWorkflowService.name);
  private graph: any = null;

  constructor(
    private readonly segmentationAgent: SegmentationAgentService,
    private readonly campaignAgent: CampaignAgentService,
    private readonly trendAgent: TrendAgentService,
    private readonly analyticsAgent: AnalyticsAgentService,
  ) {
    this.initGraph();
  }

  private async initGraph() {
    try {
      const { StateGraph, Annotation, START, END } = await import('@langchain/langgraph');

      const StateAnnotation = Annotation.Root({
        userId: Annotation<string>({ reducer: (x, y) => y ?? x, default: () => '' }),
        task: Annotation<string>({ reducer: (x, y) => y ?? x, default: () => '' }),
        nlQuery: Annotation<string>({ reducer: (x, y) => y ?? x, default: () => '' }),
        filterAST: Annotation<any>({ reducer: (x, y) => y ?? x, default: () => null }),
        campaignGoal: Annotation<string>({ reducer: (x, y) => y ?? x, default: () => '' }),
        campaignSuggestion: Annotation<any>({ reducer: (x, y) => y ?? x, default: () => null }),
        campaignId: Annotation<string>({ reducer: (x, y) => y ?? x, default: () => '' }),
        analyticsReport: Annotation<string>({ reducer: (x, y) => y ?? x, default: () => '' }),
        trends: Annotation<any[]>({ reducer: (x, y) => y ?? x, default: () => [] }),
        errors: Annotation<string[]>({ reducer: (x, y) => x.concat(y), default: () => [] }),
      });

      const workflow = new StateGraph(StateAnnotation);

      // Add nodes
      workflow.addNode('segmentation_node', async (state) => {
        try {
          const filterAST = await this.segmentationAgent.generateAST(state.nlQuery);
          return { filterAST };
        } catch (err: any) {
          return { errors: [err.message] };
        }
      });

      workflow.addNode('campaign_node', async (state) => {
        try {
          const campaignSuggestion = await this.campaignAgent.generateCampaign(state.campaignGoal);
          return { campaignSuggestion };
        } catch (err: any) {
          return { errors: [err.message] };
        }
      });

      workflow.addNode('trend_node', async (state) => {
        try {
          const trends = await this.trendAgent.runScan();
          return { trends };
        } catch (err: any) {
          return { errors: [err.message] };
        }
      });

      workflow.addNode('analytics_node', async (state) => {
        try {
          const analyticsReport = await this.analyticsAgent.generateCampaignReport(state.campaignId);
          return { analyticsReport };
        } catch (err: any) {
          return { errors: [err.message] };
        }
      });

      // Add router node and conditional edges
      workflow.addEdge(START as any, 'router_node' as any);

      workflow.addNode('router_node', (state) => {
        return state;
      });

      workflow.addConditionalEdges('router_node' as any, (state: any) => {
        switch (state.task) {
          case 'segment':
            return 'segmentation_node';
          case 'campaign':
            return 'campaign_node';
          case 'trend':
            return 'trend_node';
          case 'analytics':
            return 'analytics_node';
          default:
            return END as any;
        }
      }, {
        segmentation_node: 'segmentation_node',
        campaign_node: 'campaign_node',
        trend_node: 'trend_node',
        analytics_node: 'analytics_node',
        [END as any]: END as any,
      } as any);

      // Connect execution nodes to end
      workflow.addEdge('segmentation_node' as any, END as any);
      workflow.addEdge('campaign_node' as any, END as any);
      workflow.addEdge('trend_node' as any, END as any);
      workflow.addEdge('analytics_node' as any, END as any);

      this.graph = workflow.compile();
      this.logger.log('LangGraph StateGraph initialized successfully.');
    } catch (err: any) {
      this.logger.warn(
        `Failed to initialize LangGraph StateGraph, using direct service fallbacks. Error: ${err.message}`
      );
    }
  }

  /**
   * Run the state graph or fallback to direct services
   */
  async runWorkflow(inputs: {
    task: 'segment' | 'campaign' | 'trend' | 'analytics';
    userId?: string;
    nlQuery?: string;
    campaignGoal?: string;
    campaignId?: string;
  }): Promise<any> {
    if (this.graph) {
      try {
        this.logger.log(`Invoking LangGraph for task: ${inputs.task}`);
        const result = await this.graph.invoke({
          task: inputs.task,
          userId: inputs.userId || '',
          nlQuery: inputs.nlQuery || '',
          campaignGoal: inputs.campaignGoal || '',
          campaignId: inputs.campaignId || '',
        });

        if (result.errors && result.errors.length > 0) {
          throw new Error(result.errors.join(' | '));
        }

        return result;
      } catch (err: any) {
        this.logger.warn(`LangGraph invocation failed: ${err.message}. Falling back to direct service.`);
      }
    }

    // Direct fallbacks
    switch (inputs.task) {
      case 'segment':
        const filterAST = await this.segmentationAgent.generateAST(inputs.nlQuery || '');
        return { filterAST };
      case 'campaign':
        const campaignSuggestion = await this.campaignAgent.generateCampaign(inputs.campaignGoal || '');
        return { campaignSuggestion };
      case 'trend':
        const trends = await this.trendAgent.runScan();
        return { trends };
      case 'analytics':
        const analyticsReport = await this.analyticsAgent.generateCampaignReport(inputs.campaignId || '');
        return { analyticsReport };
      default:
        throw new BadRequestException(`Unknown task: ${inputs.task}`);
    }
  }
}
