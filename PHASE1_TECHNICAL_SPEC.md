# Phase 1 Technical Specification

## Required Database Schema Changes

### New Models to Add

#### 1. Org Model
```prisma
model Org {
  id        String   @id @default(uuid())
  name      String
  slug      String   @unique
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  members    OrgMember[]
  properties Property[]
  
  @@index([slug])
}
```

#### 2. OrgMember Model
```prisma
model OrgMember {
  id        String   @id @default(uuid())
  orgId     String
  userId    String
  role      OrgRole  // OWNER, ADMIN, MEMBER
  createdAt DateTime @default(now())
  
  org  Org  @relation(fields: [orgId], references: [id], onDelete: Cascade)
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@unique([orgId, userId])
  @@index([userId])
  @@index([orgId])
}

enum OrgRole {
  OWNER
  ADMIN
  MEMBER
}
```

#### 3. RefreshToken Model
```prisma
model RefreshToken {
  id        String    @id @default(uuid())
  userId    String
  token     String    @unique
  family    String    // For rotation detection
  expiresAt DateTime
  createdAt DateTime  @default(now())
  revokedAt DateTime?
  
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@index([userId])
  @@index([token])
  @@index([family])
}
```

#### 4. Quote Model
```prisma
model Quote {
  id          String      @id @default(uuid())
  ticketId    String
  amount      Float
  description String?
  status      QuoteStatus @default(PENDING)
  createdById String
  createdAt   DateTime    @default(now())
  approvedAt  DateTime?
  rejectedAt  DateTime?
  
  ticket    Ticket @relation(fields: [ticketId], references: [id], onDelete: Cascade)
  createdBy User   @relation(fields: [createdById], references: [id])
  
  @@index([ticketId])
  @@index([createdById])
}

enum QuoteStatus {
  PENDING
  APPROVED
  REJECTED
}
```

### Models to Modify

#### User Model Changes
```prisma
model User {
  id           String   @id @default(uuid())
  email        String   @unique
  phone        String?
  displayName  String
  passwordHash String
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  
  // REMOVE: landlordId, contractorId
  // ADD:
  orgMembers      OrgMember[]
  refreshTokens   RefreshToken[]
  quotesCreated   Quote[]
  ticketsCreated  Ticket[]       @relation("CreatedTickets")
  ticketsAssigned Ticket[]       @relation("AssignedTickets")
  
  @@index([email])
}
```

#### Property Model Changes
```prisma
model Property {
  id        String   @id @default(uuid())
  address1  String
  address2  String?
  city      String?
  postcode  String?
  orgId     String   // CHANGED: from landlordId
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  org     Org      @relation(fields: [orgId], references: [id], onDelete: Cascade)
  tickets Ticket[]
  
  @@index([orgId])
}
```

#### Ticket Model Changes
```prisma
model Ticket {
  id           String       @id @default(uuid())
  propertyId   String
  createdById  String
  assignedToId String?
  category     String
  priority     TicketPriority
  status       TicketStatus
  description  String
  slaDueAt     DateTime?
  completedAt  DateTime?
  createdAt    DateTime     @default(now())
  updatedAt    DateTime     @updatedAt
  
  // REMOVE: quoteAmount (moved to Quote model)
  // ADD:
  quotes Quote[]
  
  property   Property        @relation(fields: [propertyId], references: [id])
  createdBy  User            @relation("CreatedTickets", fields: [createdById], references: [id])
  assignedTo User?           @relation("AssignedTickets", fields: [assignedToId], references: [id])
  timeline   TimelineEvent[]
  
  @@index([propertyId, status])
  @@index([createdById])
  @@index([assignedToId])
}

enum TicketStatus {
  OPEN
  ASSIGNED
  QUOTED
  APPROVED
  IN_PROGRESS
  COMPLETED
  REJECTED
}

enum TicketPriority {
  LOW
  MEDIUM
  HIGH
  URGENT
}
```

---

## Required Backend Changes

### 1. Auth Module - Cookie-based Authentication

#### auth.service.ts
```typescript
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  async signup(dto: SignupDto) {
    // Check existing user
    const existing = await this.prisma.user.findUnique({ 
      where: { email: dto.email } 
    });
    if (existing) {
      throw new BadRequestException('Email already in use');
    }

    // Create user
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        displayName: dto.displayName,
      },
    });

    // Create default org for user
    const org = await this.prisma.org.create({
      data: {
        name: `${dto.displayName}'s Organization`,
        slug: `${dto.displayName.toLowerCase().replace(/\s+/g, '-')}-${uuidv4().slice(0, 8)}`,
      },
    });

    // Add user as org owner
    await this.prisma.orgMember.create({
      data: {
        orgId: org.id,
        userId: user.id,
        role: 'OWNER',
      },
    });

    // Generate tokens
    return this.generateTokens(user.id);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ 
      where: { email: dto.email } 
    });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const match = await bcrypt.compare(dto.password, user.passwordHash);
    if (!match) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.generateTokens(user.id);
  }

  async refresh(oldRefreshToken: string) {
    // Verify token
    let payload;
    try {
      payload = await this.jwt.verifyAsync(oldRefreshToken, {
        secret: this.config.get('app.jwt.refreshSecret'),
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Check token in database
    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { token: oldRefreshToken },
      include: { user: true },
    });

    if (!storedToken || storedToken.revokedAt) {
      // Token reuse detected - revoke entire family
      if (storedToken?.family) {
        await this.prisma.refreshToken.updateMany({
          where: { family: storedToken.family },
          data: { revokedAt: new Date() },
        });
      }
      throw new UnauthorizedException('Token reuse detected');
    }

    // Check expiration
    if (storedToken.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token expired');
    }

    // Revoke old token
    await this.prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revokedAt: new Date() },
    });

    // Generate new tokens with same family
    return this.generateTokens(storedToken.userId, storedToken.family);
  }

  async logout(refreshToken: string) {
    // Revoke refresh token
    await this.prisma.refreshToken.updateMany({
      where: { token: refreshToken },
      data: { revokedAt: new Date() },
    });
  }

  private async generateTokens(userId: string, family?: string) {
    const payload = { sub: userId };

    // Generate access token
    const accessToken = await this.jwt.signAsync(payload, {
      secret: this.config.get('app.jwt.accessSecret'),
      expiresIn: this.config.get('app.jwt.accessExpiresIn'),
    });

    // Generate refresh token
    const refreshToken = await this.jwt.signAsync(payload, {
      secret: this.config.get('app.jwt.refreshSecret'),
      expiresIn: this.config.get('app.jwt.refreshExpiresIn'),
    });

    // Store refresh token in database
    const tokenFamily = family || uuidv4();
    const expiresIn = this.config.get('app.jwt.refreshExpiresIn'); // e.g., '7d'
    const expiresAt = this.calculateExpiration(expiresIn);

    await this.prisma.refreshToken.create({
      data: {
        userId,
        token: refreshToken,
        family: tokenFamily,
        expiresAt,
      },
    });

    return { accessToken, refreshToken };
  }

  private calculateExpiration(expiresIn: string): Date {
    const match = expiresIn.match(/^(\d+)([smhd])$/);
    if (!match) throw new Error('Invalid expiration format');

    const value = parseInt(match[1]);
    const unit = match[2];

    const now = new Date();
    switch (unit) {
      case 's': return new Date(now.getTime() + value * 1000);
      case 'm': return new Date(now.getTime() + value * 60 * 1000);
      case 'h': return new Date(now.getTime() + value * 60 * 60 * 1000);
      case 'd': return new Date(now.getTime() + value * 24 * 60 * 60 * 1000);
      default: throw new Error('Invalid time unit');
    }
  }
}
```

#### auth.controller.ts
```typescript
import { Body, Controller, Post, Res, Req } from '@nestjs/common';
import { Response, Request } from 'express';
import { AuthService } from './auth.service';
import { SignupDto, LoginDto } from './dto';
import { Public } from '../../common/decorators/public.decorator';
import { ConfigService } from '@nestjs/config';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private config: ConfigService,
  ) {}

  @Public()
  @Post('signup')
  async signup(
    @Body() dto: SignupDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken, refreshToken } = await this.authService.signup(dto);
    this.setTokenCookies(res, accessToken, refreshToken);
    return { success: true };
  }

  @Public()
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken, refreshToken } = await this.authService.login(dto);
    this.setTokenCookies(res, accessToken, refreshToken);
    return { success: true };
  }

  @Public()
  @Post('refresh')
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const oldRefreshToken = req.cookies['refreshToken'];
    if (!oldRefreshToken) {
      throw new UnauthorizedException('No refresh token');
    }

    const { accessToken, refreshToken } = await this.authService.refresh(oldRefreshToken);
    this.setTokenCookies(res, accessToken, refreshToken);
    return { success: true };
  }

  @Post('logout')
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies['refreshToken'];
    if (refreshToken) {
      await this.authService.logout(refreshToken);
    }
    this.clearTokenCookies(res);
    return { success: true };
  }

  private setTokenCookies(res: Response, accessToken: string, refreshToken: string) {
    const cookieOptions = {
      httpOnly: true,
      secure: this.config.get('app.env') === 'production',
      sameSite: 'lax' as const,
      domain: this.config.get('app.cookieDomain'),
    };

    res.cookie('accessToken', accessToken, {
      ...cookieOptions,
      maxAge: 15 * 60 * 1000, // 15 minutes
    });

    res.cookie('refreshToken', refreshToken, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
  }

  private clearTokenCookies(res: Response) {
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');
  }
}
```

### 2. Org Module (NEW)

#### orgs.service.ts
```typescript
import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateOrgDto, AddMemberDto } from './dto';

@Injectable()
export class OrgsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateOrgDto) {
    const org = await this.prisma.org.create({
      data: {
        name: dto.name,
        slug: dto.slug,
      },
    });

    await this.prisma.orgMember.create({
      data: {
        orgId: org.id,
        userId,
        role: 'OWNER',
      },
    });

    return org;
  }

  async findUserOrgs(userId: string) {
    const memberships = await this.prisma.orgMember.findMany({
      where: { userId },
      include: { org: true },
    });

    return memberships.map(m => ({
      ...m.org,
      role: m.role,
    }));
  }

  async findOne(orgId: string, userId: string) {
    await this.checkMembership(orgId, userId);
    
    return this.prisma.org.findUnique({
      where: { id: orgId },
      include: {
        members: {
          include: { user: true },
        },
      },
    });
  }

  async addMember(orgId: string, userId: string, dto: AddMemberDto) {
    await this.checkOwnership(orgId, userId);

    return this.prisma.orgMember.create({
      data: {
        orgId,
        userId: dto.userId,
        role: dto.role,
      },
    });
  }

  async removeMember(orgId: string, userId: string, memberUserId: string) {
    await this.checkOwnership(orgId, userId);

    await this.prisma.orgMember.deleteMany({
      where: {
        orgId,
        userId: memberUserId,
      },
    });
  }

  private async checkMembership(orgId: string, userId: string) {
    const member = await this.prisma.orgMember.findFirst({
      where: { orgId, userId },
    });

    if (!member) {
      throw new ForbiddenException('Not a member of this organization');
    }

    return member;
  }

  private async checkOwnership(orgId: string, userId: string) {
    const member = await this.checkMembership(orgId, userId);

    if (member.role !== 'OWNER') {
      throw new ForbiddenException('Only owners can perform this action');
    }

    return member;
  }
}
```

### 3. Org Context Middleware

#### org-context.middleware.ts
```typescript
import { Injectable, NestMiddleware, BadRequestException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class OrgContextMiddleware implements NestMiddleware {
  constructor(private prisma: PrismaService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const user = req['user'];
    if (!user) {
      return next();
    }

    // Get orgId from header or query
    let orgId = req.headers['x-org-id'] as string || req.query.orgId as string;

    // If no orgId provided, use user's first org
    if (!orgId) {
      const membership = await this.prisma.orgMember.findFirst({
        where: { userId: user.id },
        orderBy: { createdAt: 'asc' },
      });

      if (membership) {
        orgId = membership.orgId;
      }
    }

    // Verify user is member of org
    if (orgId) {
      const member = await this.prisma.orgMember.findFirst({
        where: { orgId, userId: user.id },
      });

      if (!member) {
        throw new BadRequestException('Not a member of specified organization');
      }

      req['orgContext'] = {
        orgId,
        userId: user.id,
        role: member.role,
      };
    }

    next();
  }
}
```

---

## Required Frontend Changes

### 1. Vite Configuration

#### vite.config.ts
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
});
```

### 2. API Client (Cookie-based)

#### src/lib/apiClient.ts
```typescript
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';

export async function apiRequest<T = unknown>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    credentials: 'include', // Important: send cookies
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'Request failed');
  }

  return response.json();
}
```

### 3. Auth Functions (No localStorage)

#### src/lib/auth.ts
```typescript
import { apiRequest } from './apiClient';

export async function login(email: string, password: string) {
  return apiRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function signup(email: string, password: string, displayName: string) {
  return apiRequest('/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ email, password, displayName }),
  });
}

export async function logout() {
  return apiRequest('/auth/logout', {
    method: 'POST',
  });
}

export async function getMe() {
  return apiRequest('/users/me');
}
```

---

## Migration Steps

### Phase 1: Database (Week 1)
1. Add new models to schema.prisma
2. Create migration
3. Write data migration script
4. Test migration on dev database

### Phase 2: Backend Auth (Week 2)
1. Implement RefreshToken storage
2. Update auth.service.ts
3. Update auth.controller.ts with cookies
4. Add cookie middleware
5. Test auth flow

### Phase 3: Backend Org (Week 3)
1. Create orgs module
2. Add org context middleware
3. Update all services for org-scoping
4. Update guards
5. Test org isolation

### Phase 4: Frontend Setup (Week 4)
1. Create Vite project
2. Setup React Router
3. Migrate components
4. Update API client
5. Test integration

### Phase 5: Testing (Week 5-6)
1. Write unit tests
2. Write integration tests
3. Write e2e tests
4. Achieve 70% coverage

---

**Document Version**: 1.0  
**Status**: Technical Specification Complete
