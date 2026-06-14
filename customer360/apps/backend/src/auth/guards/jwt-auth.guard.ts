import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private redis: Redis;

  constructor(private readonly configService: ConfigService) {
    super();
    this.redis = new Redis({
      host: this.configService.get('REDIS_HOST', 'localhost'),
      port: this.configService.get<number>('REDIS_PORT', 6379),
      password: this.configService.get('REDIS_PASSWORD', undefined),
      maxRetriesPerRequest: 1,
      connectTimeout: 3000,
    });
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // First, let Passport validate the JWT signature and expiry
    const isValid = await super.canActivate(context);
    if (!isValid) return false;

    // Then check if the token's JTI is blacklisted in Redis
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (user?.jti) {
      const isBlacklisted = await this.redis.get(`blacklist:${user.jti}`);
      if (isBlacklisted) {
        throw new UnauthorizedException('Token has been revoked');
      }
    }

    return true;
  }

  handleRequest(err: any, user: any, info: any) {
    if (err || !user) {
      throw err || new UnauthorizedException('Authentication required');
    }
    return user;
  }
}
