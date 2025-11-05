import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

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
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  };

  const mockJwtService = {
    sign: jest.fn(),
    verify: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
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

    // Setup default config responses
    mockConfigService.get.mockImplementation((key: string) => {
      const configs = {
        'app.jwt.accessSecret': 'test-access-secret',
        'app.jwt.refreshSecret': 'test-refresh-secret',
        'app.jwt.accessExpiresIn': '15m',
        'app.jwt.refreshExpiresIn': '7d',
      };
      return configs[key];
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('signup', () => {
    const signupDto = {
      email: 'test@example.com',
      password: 'password123',
      name: 'Test User',
    };

    it('should create a new user and org successfully', async () => {
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
      
      const mockOrg = {
        id: 'org-id',
        name: "Test User's Organisation",
        type: 'LANDLORD',
      };
      
      const mockUser = {
        id: 'user-id',
        email: signupDto.email,
        name: signupDto.name,
        orgMemberships: [
          {
            orgId: mockOrg.id,
            role: 'LANDLORD',
            org: mockOrg,
          },
        ],
      };

      // First call to findUnique (checking if user exists) returns null
      // Second call in generateTokens returns the user
      mockPrismaService.user.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockUser);
      mockPrismaService.org.create.mockResolvedValue(mockOrg);
      mockPrismaService.user.create.mockResolvedValue(mockUser);
      mockJwtService.sign.mockReturnValue('mock-token');
      mockPrismaService.refreshToken.create.mockResolvedValue({});

      const result = await service.signup(signupDto.email, signupDto.password, signupDto.name);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('user');
      expect(result.user.email).toBe(signupDto.email);
      expect(mockPrismaService.org.create).toHaveBeenCalled();
      expect(mockPrismaService.user.create).toHaveBeenCalled();
    });

    it('should throw ConflictException if email already exists', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'existing-user',
        email: signupDto.email,
      });

      await expect(
        service.signup(signupDto.email, signupDto.password, signupDto.name),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    const loginDto = {
      email: 'test@example.com',
      password: 'password123',
    };

    it('should login successfully with valid credentials', async () => {
      const mockUser = {
        id: 'user-id',
        email: loginDto.email,
        passwordHash: 'hashed-password',
        orgMemberships: [
          {
            orgId: 'org-id',
            role: 'LANDLORD',
            org: { id: 'org-id', name: 'Test Org' },
          },
        ],
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockJwtService.sign.mockReturnValue('mock-token');
      mockPrismaService.refreshToken.create.mockResolvedValue({});

      const result = await service.login(loginDto.email, loginDto.password);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('user');
      expect(result.user.email).toBe(loginDto.email);
    });

    it('should throw UnauthorizedException if user does not exist', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login(loginDto.email, loginDto.password),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if password is invalid', async () => {
      const mockUser = {
        id: 'user-id',
        email: loginDto.email,
        passwordHash: 'hashed-password',
        orgMemberships: [],
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.login(loginDto.email, loginDto.password),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refresh', () => {
    const mockRefreshToken = 'mock-refresh-token';

    it('should refresh tokens successfully', async () => {
      const mockPayload = { sub: 'user-id', jti: 'token-jti' };
      const mockStoredToken = {
        id: 'token-id',
        userId: 'user-id',
        jti: 'token-jti',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        revokedAt: null,
      };
      const mockUser = {
        id: 'user-id',
        orgMemberships: [
          {
            orgId: 'org-id',
            role: 'LANDLORD',
            org: { id: 'org-id', name: 'Test Org' },
          },
        ],
      };

      mockJwtService.verify.mockReturnValue(mockPayload);
      mockPrismaService.refreshToken.findUnique.mockResolvedValue(mockStoredToken);
      mockPrismaService.refreshToken.update.mockResolvedValue({});
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockJwtService.sign.mockReturnValue('new-mock-token');
      mockPrismaService.refreshToken.create.mockResolvedValue({});

      const result = await service.refresh(mockRefreshToken);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(mockPrismaService.refreshToken.update).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException if token is invalid', async () => {
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(service.refresh(mockRefreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if token is revoked', async () => {
      const mockPayload = { sub: 'user-id', jti: 'token-jti' };
      const mockStoredToken = {
        id: 'token-id',
        userId: 'user-id',
        jti: 'token-jti',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        revokedAt: new Date(),
      };

      mockJwtService.verify.mockReturnValue(mockPayload);
      mockPrismaService.refreshToken.findUnique.mockResolvedValue(mockStoredToken);
      mockPrismaService.refreshToken.updateMany.mockResolvedValue({});

      await expect(service.refresh(mockRefreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(mockPrismaService.refreshToken.updateMany).toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    it('should revoke refresh token on logout', async () => {
      const mockRefreshToken = 'mock-refresh-token';
      const mockPayload = { sub: 'user-id', jti: 'token-jti' };

      mockJwtService.verify.mockReturnValue(mockPayload);
      mockPrismaService.refreshToken.update.mockResolvedValue({});

      await service.logout(mockRefreshToken);

      expect(mockPrismaService.refreshToken.update).toHaveBeenCalledWith({
        where: { jti: 'token-jti' },
        data: { revokedAt: expect.any(Date) },
      });
    });

    it('should handle logout errors silently', async () => {
      const mockRefreshToken = 'invalid-token';
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(service.logout(mockRefreshToken)).resolves.not.toThrow();
    });
  });
});
