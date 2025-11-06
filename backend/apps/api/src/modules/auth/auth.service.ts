import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma/prisma.service';
import * as argon2 from 'argon2';
import { v4 as uuidv4 } from 'uuid';

// Role enum values for SQLite
type Role = 'LANDLORD' | 'TENANT' | 'OPS' | 'CONTRACTOR';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async signup(email: string, password: string, name: string, role: Role = 'LANDLORD') {
    // Check if user exists
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    // Hash password with Argon2 (Step 1 requirement)
    const passwordHash = await argon2.hash(password);

    // Create landlord org if role is LANDLORD
    let org;
    let landlordId;
    if (role === 'LANDLORD') {
      org = await this.prisma.org.create({
        data: {
          name: `${name}'s Organisation`,
          type: 'LANDLORD',
        },
      });
      landlordId = org.id;
    }

    const user = await this.prisma.user.create({
      data: {
        email,
        name,
        passwordHash,
        role, // New field from Step 1
        landlordId, // New field from Step 1
        orgMemberships: org ? {
          create: {
            orgId: org.id,
            role: role,
          },
        } : undefined,
      },
      include: {
        orgMemberships: {
          include: {
            org: true,
          },
        },
      },
    });

    // Generate tokens with new session-based approach
    const { accessToken, refreshToken } = await this.generateTokens(user.id, user.role, user.landlordId);

    return { accessToken, refreshToken, user };
  }

  async login(email: string, password: string) {
    // Find user
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        orgMemberships: {
          include: {
            org: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password with Argon2 (Step 1 requirement)
    const valid = await argon2.verify(user.passwordHash, password);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate tokens with session storage
    const { accessToken, refreshToken } = await this.generateTokens(user.id, user.role, user.landlordId);

    return { accessToken, refreshToken, user };
  }

  async refresh(oldRefreshToken: string) {
    try {
      // Verify refresh token
      const payload = this.jwt.verify(oldRefreshToken, {
        secret: this.config.get<string>('app.jwt.refreshSecret'),
      });

      // Check if token exists and is not revoked
      const storedToken = await this.prisma.refreshToken.findUnique({
        where: { jti: payload.jti },
        include: {
          user: true, // Include user to get role and landlordId
        },
      });

      if (!storedToken) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      if (storedToken.revokedAt) {
        // Token reuse detected! Revoke entire chain for this user (Step 1: rotation security)
        await this.revokeAllUserTokens(storedToken.userId);
        throw new UnauthorizedException('Token reuse detected - all sessions revoked');
      }

      if (new Date() > storedToken.expiresAt) {
        throw new UnauthorizedException('Refresh token expired');
      }

      // Revoke old token
      await this.prisma.refreshToken.update({
        where: { jti: payload.jti },
        data: { revokedAt: new Date() },
      });

      // Generate new tokens with rotation (Step 1)
      const { accessToken, refreshToken, jti: newJti } = await this.generateTokens(
        storedToken.userId,
        storedToken.user.role,
        storedToken.user.landlordId,
      );

      // Link old token to new one
      await this.prisma.refreshToken.update({
        where: { jti: payload.jti },
        data: { replacedBy: newJti },
      });

      return { accessToken, refreshToken };
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(refreshToken: string) {
    try {
      const payload = this.jwt.verify(refreshToken, {
        secret: this.config.get<string>('app.jwt.refreshSecret'),
      });

      await this.prisma.refreshToken.update({
        where: { jti: payload.jti },
        data: { revokedAt: new Date() },
      });
    } catch (error) {
      // Silent fail on logout
    }
  }

  private async generateTokens(userId: string, role?: string | null, landlordId?: string | null) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        orgMemberships: {
          include: {
            org: true,
          },
        },
      },
    });

    const jti = uuidv4();

    // Access token payload (Step 1: Include sub, role, landlordId)
    const accessPayload = {
      sub: userId,
      email: user.email,
      name: user.name,
      role: role || user.role, // New: role field
      landlordId: landlordId || user.landlordId, // New: landlordId field
      orgs: user.orgMemberships.map((m) => ({
        orgId: m.orgId,
        orgName: m.org.name,
        role: m.role,
      })),
    };

    // Refresh token payload
    const refreshPayload = {
      sub: userId,
      jti,
    };

    const accessToken = this.jwt.sign(accessPayload, {
      secret: this.config.get<string>('app.jwt.accessSecret'),
      expiresIn: this.config.get<string>('app.jwt.accessExpiresIn') || '15m',
    });

    const refreshToken = this.jwt.sign(refreshPayload, {
      secret: this.config.get<string>('app.jwt.refreshSecret'),
      expiresIn: this.config.get<string>('app.jwt.refreshExpiresIn') || '7d',
    });

    // Store refresh token in database
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await this.prisma.refreshToken.create({
      data: {
        userId,
        jti,
        expiresAt,
      },
    });

    // Also create Session for new auth flow (Step 1)
    const refreshHash = await argon2.hash(refreshToken);
    await this.prisma.session.create({
      data: {
        userId,
        refreshHash,
        expiresAt,
      },
    });

    return { accessToken, refreshToken, jti };
  }

  private async revokeAllUserTokens(userId: string) {
    await this.prisma.refreshToken.updateMany({
      where: {
        userId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });
  }

  async validateUser(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        orgMemberships: {
          include: {
            org: true,
          },
        },
      },
    });
  }
}
