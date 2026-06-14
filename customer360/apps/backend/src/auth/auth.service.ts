import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import Redis from 'ioredis';
import { User } from '../entities/user.entity';
import { AuditService } from '../audit/audit.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { Response } from 'express';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class AuthService {
  private redis: Redis;

  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly auditService: AuditService,
  ) {
    const redisUrl = this.configService.get<string>('REDIS_URL');
    if (redisUrl) {
      this.redis = new Redis(redisUrl, { maxRetriesPerRequest: null, connectTimeout: 3000 });
    } else {
      this.redis = new Redis({
        host: this.configService.get('REDIS_HOST', 'localhost'),
        port: this.configService.get<number>('REDIS_PORT', 6379),
        password: this.configService.get('REDIS_PASSWORD', undefined),
        maxRetriesPerRequest: null,
        connectTimeout: 3000,
      });
    }
    this.redis.on('error', (err) => {
      this.logger.error(`Redis auth service error: ${err.message}`);
    });
  }

  async register(dto: RegisterDto, ip?: string) {
    // Check if user already exists
    const existing = await this.userRepo.findOne({ where: { email: dto.email.toLowerCase() } });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    // Create user
    const user = this.userRepo.create({
      email: dto.email.toLowerCase(),
      passwordHash,
      role: dto.role || 'analyst',
    });
    const saved = await this.userRepo.save(user);

    // Audit log
    await this.auditService.log(
      saved.id,
      'USER_REGISTERED',
      'user',
      saved.id,
      { email: saved.email, role: saved.role },
      ip,
    );

    // Return user without password
    const { passwordHash: _, ...result } = saved;
    return result;
  }

  async login(dto: LoginDto, res: Response, ip?: string) {
    // Find user
    const user = await this.userRepo.findOne({ where: { email: dto.email.toLowerCase() } });
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Verify password
    const isValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Generate JWT with JTI for blacklist support
    const jti = randomUUID();
    const expiresIn = this.configService.get('JWT_EXPIRY', '7d');
    const token = this.jwtService.sign(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
        jti,
      },
      { expiresIn },
    );

    // Set HTTP-only cookie for JWT
    const isProduction = this.configService.get('NODE_ENV') === 'production';
    res.cookie('access_token', token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'strict' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/',
    });

    // Set CSRF token cookie (non-HTTP-only so frontend can read it)
    const csrfToken = randomUUID();
    res.cookie('csrf_token', csrfToken, {
      httpOnly: false,
      secure: isProduction,
      sameSite: isProduction ? 'strict' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });

    // Audit log
    await this.auditService.log(
      user.id,
      'USER_LOGGED_IN',
      'user',
      user.id,
      { email: user.email },
      ip,
    );

    // Return user info (no password)
    const { passwordHash: _, ...result } = user;
    return result;
  }

  async logout(user: { id: string; jti: string }, res: Response, ip?: string) {
    // Blacklist the JTI in Redis with TTL matching token remaining lifetime
    // We set a conservative TTL of 7 days (max token lifetime)
    if (user.jti) {
      await this.redis.set(`blacklist:${user.jti}`, '1', 'EX', 7 * 24 * 60 * 60);
    }

    // Clear cookies
    res.clearCookie('access_token', { path: '/' });
    res.clearCookie('csrf_token', { path: '/' });

    // Audit log
    await this.auditService.log(
      user.id,
      'USER_LOGGED_OUT',
      'user',
      user.id,
      {},
      ip,
    );

    return { message: 'Logged out successfully' };
  }

  async me(userId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    const { passwordHash: _, ...result } = user;
    return result;
  }
}
