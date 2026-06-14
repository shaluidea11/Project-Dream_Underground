import {
  Controller,
  Post,
  Get,
  Param,
  Req,
  Res,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UploadService } from './upload.service';
import { validateUploadFile } from './validators/file-validator';

@Controller('upload')
@UseGuards(JwtAuthGuard)
export class UploadController {
  private redisSub: Redis;

  constructor(
    private readonly uploadService: UploadService,
    private readonly config: ConfigService,
  ) {
    this.redisSub = new Redis({
      host: this.config.get('REDIS_HOST', 'localhost'),
      port: this.config.get<number>('REDIS_PORT', 6379),
      password: this.config.get('REDIS_PASSWORD', undefined),
      maxRetriesPerRequest: 1,
    });
  }

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 50 * 1024 * 1024 },
    }),
  )
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Query('type') uploadType: string,
    @Req() req: Request,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // Validate file
    validateUploadFile(file);

    const type = uploadType === 'orders' ? 'orders' : 'customers';
    const user = req.user as any;
    const ip = req.ip || req.socket.remoteAddress;

    const job = await this.uploadService.createJob(
      user.id,
      file.originalname,
      file.buffer,
      type as 'customers' | 'orders',
      ip,
    );

    return {
      id: job.id,
      fileName: job.fileName,
      type: job.type,
      status: job.status,
      createdAt: job.createdAt,
    };
  }

  @Get(':id')
  async getJob(@Param('id') id: string) {
    return this.uploadService.getJob(id);
  }

  @Get()
  async getJobs(@Req() req: Request) {
    const user = req.user as any;
    return this.uploadService.getJobs(user.id);
  }

  /**
   * SSE endpoint for real-time upload progress.
   */
  @Get(':id/status')
  async streamStatus(
    @Param('id') id: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    // Send current status immediately
    const job = await this.uploadService.getJob(id);
    res.write(`data: ${JSON.stringify({
      status: job.status,
      recordsProcessed: job.recordsProcessed,
      duplicatesMerged: job.duplicatesMerged,
      errorMessage: job.errorMessage,
      schemaMap: job.schemaMap,
    })}\n\n`);

    // If already completed/failed, close
    if (job.status === 'completed' || job.status === 'failed') {
      res.end();
      return;
    }

    // Subscribe to Redis pub/sub for live updates
    const subscriber = this.redisSub.duplicate();
    const channel = `upload:${id}`;

    subscriber.subscribe(channel);
    subscriber.on('message', (ch: string, message: string) => {
      if (ch === channel) {
        res.write(`data: ${message}\n\n`);
        const parsed = JSON.parse(message);
        if (parsed.status === 'completed' || parsed.status === 'failed') {
          subscriber.unsubscribe(channel);
          subscriber.disconnect();
          res.end();
        }
      }
    });

    // Clean up on client disconnect
    req.on('close', () => {
      subscriber.unsubscribe(channel);
      subscriber.disconnect();
    });
  }
}
