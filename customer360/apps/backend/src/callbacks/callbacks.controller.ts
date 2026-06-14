import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { SkipThrottle } from '@nestjs/throttler';
import { SimulatorSecretGuard } from './guards/simulator-secret.guard';

interface CallbackDto {
  campaignId: string;
  communicationId: string;
  status: string;
  timestamp: string;
}

@Controller('callbacks')
@UseGuards(SimulatorSecretGuard)
@SkipThrottle()
export class CallbacksController {
  constructor(
    @InjectQueue('callback.process')
    private readonly callbackQueue: Queue,
  ) {}

  @Post('delivery')
  async handleDeliveryCallback(@Body() body: CallbackDto) {
    await this.callbackQueue.add('process', {
      campaignId: body.campaignId,
      communicationId: body.communicationId,
      status: body.status,
      timestamp: body.timestamp,
    });
    return { status: 'queued' };
  }
}
