import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SimulatorSecretGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const secret = req.headers['x-simulator-secret'];
    const expected = this.config.get<string>('CHANNEL_SIMULATOR_SECRET') ||
                     this.config.get<string>('SIMULATOR_SECRET') ||
                     'dev-simulator-secret';
    
    if (secret !== expected) {
      throw new UnauthorizedException('Invalid simulator secret');
    }
    return true;
  }
}
