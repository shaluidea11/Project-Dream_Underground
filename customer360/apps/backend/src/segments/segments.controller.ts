import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SegmentsService, CreateSegmentDto } from './segments.service';

@Controller('segments')
@UseGuards(JwtAuthGuard)
export class SegmentsController {
  constructor(private readonly segmentsService: SegmentsService) {}

  // ═══════════════════════════════════════════════════════════
  // ROUTE ORDER MATTERS: ai-generate MUST be before :id
  // NestJS resolves top-to-bottom — /:id would match "ai-generate"
  // ═══════════════════════════════════════════════════════════

  @Post('ai-generate')
  async aiGenerate(@Body() body: { nlQuery: string }) {
    return this.segmentsService.aiGenerate(body.nlQuery);
  }

  @Post()
  async create(@Body() dto: CreateSegmentDto, @Req() req: any) {
    return this.segmentsService.create(dto, req.user.id);
  }

  @Get()
  async findAll() {
    return this.segmentsService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.segmentsService.findOne(id);
  }

  @Get(':id/members')
  async getMembers(
    @Param('id') id: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.segmentsService.getMembers(id, page, limit);
  }

  @Post(':id/recompute')
  async recompute(@Param('id') id: string) {
    return this.segmentsService.recompute(id);
  }
}
