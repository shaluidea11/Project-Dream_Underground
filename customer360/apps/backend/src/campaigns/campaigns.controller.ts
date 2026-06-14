import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CampaignsService, CreateCampaignDto } from './campaigns.service';

@Controller('campaigns')
@UseGuards(JwtAuthGuard)
export class CampaignsController {
  constructor(private readonly campaignsService: CampaignsService) {}

  // ═══════════════════════════════════════════════════════════
  // ROUTE ORDER MATTERS: ai-generate MUST be before :id
  // ═══════════════════════════════════════════════════════════

  @Post('ai-generate')
  async aiGenerate(@Body() body: { goal: string }) {
    return this.campaignsService.aiGenerate(body.goal);
  }

  @Post()
  async create(@Body() dto: CreateCampaignDto, @Req() req: any) {
    return this.campaignsService.create(dto, req.user.id);
  }

  @Get()
  async findAll() {
    return this.campaignsService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.campaignsService.findOne(id);
  }

  @Post(':id/launch')
  async launch(@Param('id') id: string) {
    return this.campaignsService.launch(id);
  }
}
