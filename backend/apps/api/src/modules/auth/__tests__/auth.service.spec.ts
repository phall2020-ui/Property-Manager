import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../auth.service';
import { PrismaService } from '../../../common/prisma/prisma.service';
import * as argon2 from 'argon2';

jest.mock('argon2');

describe('AuthService', () => {
  let service: AuthService;
  let prisma: jest.Mocked<PrismaService>;
  let jwt: jest.Mocked<JwtService>;
  let config: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    const mockPrisma = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
      org: {
        create: jest.fn(),
      },
      refreshToken: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
    };

    const mockJwt = {
      sign: jest.fn(),
      verify: jest.fn(),
    };

    const mockConfig = {
      get: jest.fn((key: string) => {
        const config: Record<string, any> = {
          'app.jwt.accessSecret': 'test-access-secret',
          'app.jwt.refreshSecret': 'test-refresh-secret',
          'app.jwt.accessExpiresIn': '15m',
          'app.jwt.refreshExpiresIn': '7d',
        };
        return config[key];
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwt },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get(PrismaService) as jest.Mocked<PrismaService>;
    jwt = module.get(JwtService) as jest.Mocked<JwtService>;
    config = module.get(ConfigService) as jest.Mocked<ConfigService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('signup', () => {
    it('should create a new landlord user with organization', async () => {
      const email = 'test@example.com';
      const password = 'password123';
      const name = 'Test User';

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (argon2.hash as jest.Mock).mockResolvedValue('hashed-password');
      (prisma.org.create as jest.Mock).mockResolvedValue({
        id: 'org-id',
        name: "Test User's Organisation",
        type: 'LANDLORD',
      });
      (prisma.user.create as jest.Mock).mockResolvedValue({
        id: 'user-id',
        email,
        name,
        passwordHash: 'hashed-password',
        role: 'LANDLORD',
        landlordId: 'org-id',
        orgMemberships: [
          {
            orgId: 'org-id',
            org: { id: 'org-id', name: "Test User's Organisation" },
            role: 'LANDLORD',
          },
        ],
      });
      (jwt.sign as jest.Mock).mockReturnValueOnce('access-token').mockReturnValueOnce('refresh-token');
      (prisma.refreshToken.create as jest.Mock).mockResolvedValue({
        jti: 'jti-id',
      });

      const result = await service.signup(email, password, name);

      expect(result.accessToken).toBe('access-token');
      expect(result.refreshToken).toBe('refresh-token');
      expect(result.user.email).toBe(email);
      expect(argon2.hash).toHaveBeenCalledWith(password);
      expect(prisma.org.create).toHaveBeenCalled();
    });

    it('should throw ConflictException if email already exists', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'existing-user',
        email: 'test@example.com',
      });

      await expect(service.signup('test@example.com', 'password', 'Test')).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('login', () => {
    it('should login with valid credentials', async () => {
      const email = 'test@example.com';
      const password = 'password123';

      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user-id',
        email,
        name: 'Test User',
        passwordHash: 'hashed-password',
        role: 'LANDLORD',
        landlordId: 'org-id',
        orgMemberships: [],
      });
      (argon2.verify as jest.Mock).mockResolvedValue(true);
      (jwt.sign as jest.Mock).mockReturnValueOnce('access-token').mockReturnValueOnce('refresh-token');
      (prisma.refreshToken.create as jest.Mock).mockResolvedValue({ jti: 'jti-id' });

      const result = await service.login(email, password);

      expect(result.accessToken).toBe('access-token');
      expect(result.refreshToken).toBe('refresh-token');
      expect(argon2.verify).toHaveBeenCalledWith('hashed-password', password);
    });

    it('should throw UnauthorizedException for invalid email', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.login('invalid@example.com', 'password')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException for invalid password', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user-id',
        email: 'test@example.com',
        passwordHash: 'hashed-password',
      });
      (argon2.verify as jest.Mock).mockResolvedValue(false);

      await expect(service.login('test@example.com', 'wrong-password')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('refresh', () => {
    it('should refresh token successfully', async () => {
      const oldToken = 'old-refresh-token';
      (jwt.verify as jest.Mock).mockReturnValue({ jti: 'old-jti' });
      (prisma.refreshToken.findUnique as jest.Mock).mockResolvedValue({
        jti: 'old-jti',
        userId: 'user-id',
        revokedAt: null,
        expiresAt: new Date(Date.now() + 1000000),
        user: {
          id: 'user-id',
          role: 'LANDLORD',
          landlordId: 'org-id',
        },
      });
      (jwt.sign as jest.Mock).mockReturnValueOnce('new-access-token').mockReturnValueOnce('new-refresh-token');
      (prisma.refreshToken.create as jest.Mock).mockResolvedValue({ jti: 'new-jti' });
      (prisma.refreshToken.update as jest.Mock).mockResolvedValue({});

      const result = await service.refresh(oldToken);

      expect(result.accessToken).toBe('new-access-token');
      expect(result.refreshToken).toBe('new-refresh-token');
      expect(prisma.refreshToken.update).toHaveBeenCalledWith({
        where: { jti: 'old-jti' },
        data: { revokedAt: expect.any(Date) },
      });
    });

    it('should detect token reuse and revoke all tokens', async () => {
      const oldToken = 'reused-token';
      (jwt.verify as jest.Mock).mockReturnValue({ jti: 'old-jti' });
      (prisma.refreshToken.findUnique as jest.Mock).mockResolvedValue({
        jti: 'old-jti',
        userId: 'user-id',
        revokedAt: new Date(Date.now() - 1000), // Already revoked
        user: {
          id: 'user-id',
        },
      });
      (prisma.refreshToken.updateMany as jest.Mock).mockResolvedValue({});

      await expect(service.refresh(oldToken)).rejects.toThrow(UnauthorizedException);
      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-id',
          revokedAt: null,
        },
        data: {
          revokedAt: expect.any(Date),
        },
      });
    });

    it('should throw UnauthorizedException for expired token', async () => {
      (jwt.verify as jest.Mock).mockReturnValue({ jti: 'old-jti' });
      (prisma.refreshToken.findUnique as jest.Mock).mockResolvedValue({
        jti: 'old-jti',
        userId: 'user-id',
        revokedAt: null,
        expiresAt: new Date(Date.now() - 1000), // Expired
        user: { id: 'user-id' },
      });

      await expect(service.refresh('expired-token')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for invalid token', async () => {
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(service.refresh('invalid-token')).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('logout', () => {
    it('should revoke refresh token on logout', async () => {
      const refreshToken = 'refresh-token';
      (jwt.verify as jest.Mock).mockReturnValue({ jti: 'jti-id' });
      (prisma.refreshToken.update as jest.Mock).mockResolvedValue({});

      await service.logout(refreshToken);

      expect(prisma.refreshToken.update).toHaveBeenCalledWith({
        where: { jti: 'jti-id' },
        data: { revokedAt: expect.any(Date) },
      });
    });
  });
});
