# security.md — Customer360 AI CRM
> **Dream Underground CRM** | Security Architecture Document  
> Version: 1.0 | Status: Approved for Stage 0

---

## 1. Authentication Architecture

### 1.1 JWT + HTTP-only Cookie

**Token issuance:**
```typescript
// auth.service.ts
const token = this.jwtService.sign(
  { sub: user.id, email: user.email, role: user.role },
  { expiresIn: '7d', secret: process.env.JWT_SECRET }
);

// Set as HTTP-only cookie (not accessible from JavaScript)
res.cookie('access_token', token, {
  httpOnly: true,
  secure: true,          // HTTPS only in production
  sameSite: 'strict',    // CSRF protection
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
  path: '/',
});
```

**Why HTTP-only cookie over localStorage:**
- localStorage is readable by JavaScript — XSS attack steals token
- HTTP-only cookie is invisible to JavaScript — XSS cannot exfiltrate it
- `sameSite: strict` prevents CSRF (cookie not sent on cross-site requests)

### 1.2 Token Blacklist (Logout)

On logout, the token's JTI (JWT ID) is added to a Redis blacklist with TTL = token remaining lifetime:

```typescript
// On login: add jti claim
const token = this.jwtService.sign({
  sub: user.id, email: user.email, role: user.role,
  jti: randomUUID()  // unique per token
});

// On logout: blacklist the jti
await this.redis.set(`blacklist:${jti}`, '1', 'EX', remainingSeconds);

// On each request: check blacklist in JwtAuthGuard
const isBlacklisted = await this.redis.get(`blacklist:${jti}`);
if (isBlacklisted) throw new UnauthorizedException();
```

### 1.3 Password Security
- Hashing: **bcrypt** with salt rounds = 12
- Min requirements: 8 chars, 1 uppercase, 1 digit
- No password recovery in v1 (admin resets manually)

---

## 2. Role-Based Access Control (RBAC)

### 2.1 Permission Matrix

| Action | Admin | Marketing Manager | Analyst |
|---|---|---|---|
| Register new users | ✅ | ❌ | ❌ |
| Upload customer/order data | ✅ | ✅ | ❌ |
| View customers | ✅ | ✅ | ✅ |
| Create segments | ✅ | ✅ | ❌ |
| View segments | ✅ | ✅ | ✅ |
| Create campaigns | ✅ | ✅ | ❌ |
| Launch campaigns | ✅ | ✅ | ❌ |
| View campaigns | ✅ | ✅ | ✅ |
| View analytics | ✅ | ✅ | ✅ |
| View audit logs | ✅ | ❌ | ❌ |
| Delete data | ✅ | ❌ | ❌ |

### 2.2 Implementation

```typescript
// roles.decorator.ts
export const Roles = (...roles: Role[]) => SetMetadata('roles', roles);

// roles.guard.ts
@Injectable()
export class RolesGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.get<Role[]>('roles', context.getHandler());
    if (!requiredRoles) return true;
    const { user } = context.switchToHttp().getRequest();
    return requiredRoles.includes(user.role);
  }
}

// Usage on controllers
@Post('launch')
@Roles(Role.Admin, Role.MarketingManager)
@UseGuards(JwtAuthGuard, RolesGuard)
async launchCampaign(@Param('id') id: string) { ... }
```

---

## 3. SQL Injection Prevention

**Strategy: TypeORM parameterized queries only. Never raw string interpolation.**

```typescript
// ✅ SAFE — TypeORM query builder with parameters
const customers = await this.customerRepo
  .createQueryBuilder('c')
  .where('c.totalSpend > :minSpend', { minSpend: filterDto.minSpend })
  .andWhere('c.lastOrderAt < :date', { date: cutoffDate })
  .getMany();

// ❌ NEVER DO THIS
const customers = await this.dataSource.query(
  `SELECT * FROM customers WHERE total_spend > ${filterDto.minSpend}` // SQL injection!
);
```

**AI-generated filters:** The SegmentationAgent generates a `FilterAST` (structured JSON object). The backend converts this AST to TypeORM query builder calls — never to raw SQL strings:

```typescript
// filter-executor.service.ts
const COLUMN_WHITELIST: Record<string, string> = {
  totalSpend:       'c.total_spend',
  orderCount:       'c.order_count',
  engagementScore:  'c.engagement_score',
  city:             'c.city',
  state:            'c.state',
  lastOrderAt:      'c.last_order_at',
  preferredChannel: 'c.preferred_channel',
};

const SAFE_OPERATORS: Record<string, string> = {
  gt: '>', lt: '<', gte: '>=', lte: '<=', eq: '=', neq: '!=',
};

function applyFilter(qb: SelectQueryBuilder, node: FilterCondition, index: number) {
  const col = COLUMN_WHITELIST[node.field];
  const op  = SAFE_OPERATORS[node.op];
  if (!col || !op) throw new BadRequestException(`Unsupported filter field or operator: ${node.field} ${node.op}`);
  const paramKey = `param_${index}`;
  qb.andWhere(`${col} ${op} :${paramKey}`, { [paramKey]: node.value });
}
// NOTE: node.op is the key — NOT node.operator. The LLM prompt must enforce "op", not "operator".
```

`SAFE_OPERATORS` is a hardcoded map: `{ gt: '>', lt: '<', eq: '=', gte: '>=', lte: '<=', neq: '!=' }` — no user input reaches the operator slot.

---

## 4. XSS Prevention

### 4.1 Frontend
- Next.js escapes all JSX output by default
- ShadCN components never use `dangerouslySetInnerHTML`
- Message preview: render as plain text, not HTML, unless channel = Email
- Email preview: sanitize with `DOMPurify` before rendering in preview iframe

```typescript
// message-preview.tsx
import DOMPurify from 'dompurify';

const EmailPreview = ({ html }: { html: string }) => (
  <iframe
    srcDoc={DOMPurify.sanitize(html, { ALLOWED_TAGS: ['p', 'b', 'i', 'a', 'br'] })}
    sandbox="allow-same-origin"
  />
);
```

### 4.2 Backend
- All string inputs validated via `class-validator` DTOs before processing
- NestJS `ValidationPipe` enabled globally with `whitelist: true` (strips unknown fields)

```typescript
// main.ts
app.useGlobalPipes(new ValidationPipe({
  whitelist: true,      // strip unknown properties
  forbidNonWhitelisted: true,
  transform: true,
}));
```

---

## 5. CSRF Protection

HTTP-only cookie with `sameSite: 'strict'` provides inherent CSRF protection for browser-based requests.

Additionally, for state-changing requests, a **Double Submit Cookie** pattern:
1. On login, a separate non-HTTP-only `csrf_token` cookie is set (random UUID)
2. Frontend reads this cookie and sends it as `X-CSRF-Token` header on all POST/PUT/DELETE
3. Backend validates: `cookie.csrf_token === header['x-csrf-token']`

```typescript
// csrf.guard.ts
@Injectable()
export class CsrfGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return true;
    const cookieToken = req.cookies['csrf_token'];
    const headerToken = req.headers['x-csrf-token'];
    if (!cookieToken || cookieToken !== headerToken) {
      throw new ForbiddenException('CSRF token mismatch');
    }
    return true;
  }
}
```

---

## 6. Rate Limiting

```typescript
// main.ts — global rate limiter
import { ThrottlerModule } from '@nestjs/throttler';

ThrottlerModule.forRoot([
  {
    name: 'short',
    ttl: 60_000,    // 1 minute window
    limit: 60,      // 60 requests per minute (general)
  },
  {
    name: 'auth',
    ttl: 900_000,   // 15 minute window
    limit: 10,      // 10 login attempts per 15 minutes
  }
])

// Auth endpoints: stricter limit applied via @Throttle decorator
@Post('login')
@Throttle({ auth: { ttl: 900_000, limit: 10 } })
async login() { ... }
```

---

## 7. File Upload Validation

```typescript
// upload.service.ts
const ALLOWED_MIME_TYPES = [
  'text/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

// Validation steps:
// 1. Check MIME type (from Content-Type header)
if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
  throw new BadRequestException('Invalid file type. Only CSV and Excel files allowed.');
}

// 2. Check file size
if (file.size > MAX_FILE_SIZE) {
  throw new BadRequestException('File too large. Max 50MB allowed.');
}

// 3. Magic bytes check (don't trust Content-Type alone)
const magicBytes = file.buffer.slice(0, 4);
const isXlsx = magicBytes.equals(Buffer.from([0x50, 0x4B, 0x03, 0x04])); // ZIP/XLSX
const isCsv = file.originalname.endsWith('.csv');
if (!isXlsx && !isCsv) {
  throw new BadRequestException('File content does not match declared type.');
}

// 4. Virus scan placeholder (future: integrate ClamAV)
// 5. Row limit check during streaming parse
```

---

## 8. PII Encryption

Fields classified as PII: `email`, `phone`, `canonical_name`

**Approach:** Application-level encryption using AES-256-GCM before writing to DB.

```typescript
// encryption.service.ts
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY = Buffer.from(process.env.ENCRYPTION_KEY, 'hex'); // 32 bytes

encrypt(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, KEY, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

decrypt(ciphertext: string): string {
  const [ivHex, tagHex, encHex] = ciphertext.split(':');
  const decipher = createDecipheriv(ALGORITHM, KEY, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  return decipher.update(Buffer.from(encHex, 'hex')) + decipher.final('utf8');
}
```

**Tradeoff:** Encrypted PII cannot be indexed or searched efficiently. Solution:
- Store a **SHA-256 hash** of normalized phone/email in separate indexed columns (`email_hash`, `phone_hash`)
- All lookups use the hash column
- Actual PII stored encrypted, decrypted only for display

---

## 9. API Security

### 9.1 Secrets Management
- All secrets in Railway environment variables (never in codebase)
- `.env` files are gitignored
- `.env.example` files contain only placeholder values
- Secrets rotated: JWT secret every 90 days, API keys on any suspected exposure

### 9.2 CORS Configuration

```typescript
// main.ts
app.enableCors({
  origin: [
    process.env.FRONTEND_URL,  // Vercel production URL
    'http://localhost:3000',    // local dev
  ],
  credentials: true,           // allow cookies
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'X-CSRF-Token'],
});
```

### 9.3 Security Headers (Helmet)

```typescript
// main.ts
import helmet from 'helmet';
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
  hsts: { maxAge: 31536000, includeSubDomains: true },
}));
```

### 9.4 Callback Endpoint Security (Simulator → CRM)

The `/callbacks/delivery` endpoint is public (no JWT) but protected by shared secret:

```typescript
// callbacks.guard.ts
@Injectable()
export class SimulatorSecretGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const secret = req.headers['x-simulator-secret'];
    if (secret !== process.env.CHANNEL_SIMULATOR_SECRET) {
      throw new UnauthorizedException('Invalid simulator secret');
    }
    return true;
  }
}
```

---

## 10. Audit Logging

Every state-changing action is logged to `audit_logs`:

```typescript
// audit.service.ts
async log(userId: string, action: string, resourceType: string, resourceId: string, metadata?: object, ip?: string) {
  await this.auditRepo.insert({
    userId, action, resourceType, resourceId,
    metadata: metadata ?? {},
    ipAddress: ip,
    createdAt: new Date(),
  });
}

// Logged actions:
// USER_REGISTERED, USER_LOGGED_IN, USER_LOGGED_OUT
// FILE_UPLOADED, CUSTOMERS_IMPORTED, DUPLICATES_MERGED
// SEGMENT_CREATED, SEGMENT_DELETED
// CAMPAIGN_CREATED, CAMPAIGN_LAUNCHED, CAMPAIGN_PAUSED
// DATA_EXPORTED
```

---

## 11. Security Checklist (per release)

- [ ] All env vars set in Railway/Vercel (none missing)
- [ ] JWT_SECRET rotated from default
- [ ] ENCRYPTION_KEY is 32 random bytes (64 hex chars)
- [ ] CORS origin matches production URL exactly
- [ ] CHANNEL_SIMULATOR_SECRET is set on both services
- [ ] No `console.log` with sensitive data in production build
- [ ] Dependencies audited: `npm audit --audit-level=high`
- [ ] Sentry DSN configured and error capture verified
- [ ] Rate limiting tested on `/auth/login`
- [ ] File upload: attempt upload of `.exe` → rejected
- [ ] CSRF: attempt POST without CSRF header → 403