import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../../apps/api/src/modules/auth/auth.service';
import { PrismaService } from '../../apps/api/src/modules/common/prisma/prisma.service';
import { testUsers } from '../fixtures/test-data';
import * as argon2 from 'argon2';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: PrismaService;
  let jwt: JwtService;
  let config: ConfigService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    org: {
      create: jest.fn(),
    },
    refreshToken: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  const mockJwtService = {
    sign: jest.fn(),
    verify: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config: Record<string, string> = {
        JWT_ACCESS_SECRET: 'test-access-secret',
        JWT_REFRESH_SECRET: 'test-refresh-secret',
        JWT_ACCESS_EXPIRY: '15m',
        JWT_REFRESH_EXPIRY: '7d',
      };
      return config[key];
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get<PrismaService>(PrismaService);
    jwt = module.get<JwtService>(JwtService);
    config = module.get<ConfigService>(ConfigService);

    jest.clearAllMocks();
  });

  describe('signup', () => {
    it('should create a new user successfully', async () => {
      const userData = testUsers.landlord;
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.org.create.mockResolvedValue({ id: 'org-123' });
      mockPrismaService.user.create.mockResolvedValue({
        id: 'user-123',
        email: userData.email,
        name: userData.name,
        role: userData.role,
      });
      mockJwtService.sign.mockReturnValue('mock-token');

      const result = await service.signup(
        userData.email,
        userData.password,
        userData.name,
        userData.role
      );

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(mockPrismaService.user.create).toHaveBeenCalled();
    });

    it('should throw ConflictException if email already exists', async () => {
      const userData = testUsers.landlord;
      mockPrismaService.user.findUnique.mockResolvedValue({ id: 'existing-user' });

      await expect(
        service.signup(userData.email, userData.password, userData.name)
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    it('should login successfully with valid credentials', async () => {
      const userData = testUsers.landlord;
      const hashedPassword = await argon2.hash(userData.password);

      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-123',
        email: userData.email,
        passwordHash: hashedPassword,
        role: userData.role,
        orgMemberships: [{ orgId: 'org-123', role: userData.role }],
      });
      mockJwtService.sign.mockReturnValue('mock-token');
      mockPrismaService.refreshToken.create.mockResolvedValue({ id: 'token-123' });

      const result = await service.login(userData.email, userData.password);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    it('should throw UnauthorizedException with invalid email', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login('invalid@example.com', 'password')
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException with invalid password', async () => {
      const userData = testUsers.landlord;
      const hashedPassword = await argon2.hash('correct-password');

      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-123',
        email: userData.email,
        passwordHash: hashedPassword,
      });

      await expect(
        service.login(userData.email, 'wrong-password')
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refresh', () => {
    it('should refresh token successfully', async () => {
      const refreshToken = 'valid-refresh-token';
      mockJwtService.verify.mockReturnValue({ sub: 'user-123', tokenId: 'token-123' });
      mockPrismaService.refreshToken.findUnique.mockResolvedValue({
        id: 'token-123',
        userId: 'user-123',
        revoked: false,
      });
      mockJwtService.sign.mockReturnValue('new-access-token');
      mockPrismaService.refreshToken.update.mockResolvedValue({});

      const result = await service.refresh(refreshToken);

      expect(result).toHaveProperty('accessToken');
      expect(mockJwtService.sign).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException with invalid token', async () => {
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(service.refresh('invalid-token')).rejects.toThrow(UnauthorizedException);
    });
  });
});

