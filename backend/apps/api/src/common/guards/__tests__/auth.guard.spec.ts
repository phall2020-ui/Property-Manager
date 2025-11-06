import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '../auth.guard';
import { PrismaService } from '../../prisma/prisma.service';
import { IS_PUBLIC_KEY } from '../../decorators/public.decorator';

describe('AuthGuard', () => {
  let guard: AuthGuard;
  let reflector: jest.Mocked<Reflector>;
  let jwtService: jest.Mocked<JwtService>;
  let configService: jest.Mocked<ConfigService>;
  let prismaService: jest.Mocked<PrismaService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthGuard,
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            verifyAsync: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('test-secret'),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            user: {
              findUnique: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    guard = module.get<AuthGuard>(AuthGuard);
    reflector = module.get(Reflector) as jest.Mocked<Reflector>;
    jwtService = module.get(JwtService) as jest.Mocked<JwtService>;
    configService = module.get(ConfigService) as jest.Mocked<ConfigService>;
    prismaService = module.get(PrismaService) as jest.Mocked<PrismaService>;
  });

  const createMockExecutionContext = (headers: any = {}): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          headers,
        }),
      }),
      getHandler: jest.fn(),
      getClass: jest.fn(),
    } as any;
  };

  describe('canActivate', () => {
    it('should allow access to public routes', async () => {
      reflector.getAllAndOverride.mockReturnValue(true);
      const context = createMockExecutionContext();

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);
    });

    it('should throw UnauthorizedException if no authorization header', async () => {
      reflector.getAllAndOverride.mockReturnValue(false);
      const context = createMockExecutionContext();

      await expect(guard.canActivate(context)).rejects.toThrow(
        new UnauthorizedException('Missing Authorization header'),
      );
    });

    it('should throw UnauthorizedException if authorization header is invalid', async () => {
      reflector.getAllAndOverride.mockReturnValue(false);
      const context = createMockExecutionContext({
        authorization: 'InvalidFormat',
      });

      await expect(guard.canActivate(context)).rejects.toThrow(
        new UnauthorizedException('Invalid Authorization header'),
      );
    });

    it('should throw UnauthorizedException if token type is not Bearer', async () => {
      reflector.getAllAndOverride.mockReturnValue(false);
      const context = createMockExecutionContext({
        authorization: 'Basic token123',
      });

      await expect(guard.canActivate(context)).rejects.toThrow(
        new UnauthorizedException('Invalid Authorization header'),
      );
    });

    it('should attach user to request with valid token', async () => {
      reflector.getAllAndOverride.mockReturnValue(false);
      const mockUser = {
        id: 'user-id',
        email: 'test@example.com',
        name: 'Test User',
        role: 'LANDLORD',
        landlordId: 'org-id',
        orgMemberships: [
          {
            orgId: 'org-id',
            role: 'LANDLORD',
            org: {
              id: 'org-id',
              name: 'Test Org',
            },
          },
        ],
      };
      const mockRequest: any = {
        headers: {
          authorization: 'Bearer valid-token',
        },
      };
      const context = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
        getHandler: jest.fn(),
        getClass: jest.fn(),
      } as any;

      jwtService.verifyAsync.mockResolvedValue({ sub: 'user-id' });
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(jwtService.verifyAsync).toHaveBeenCalledWith('valid-token', {
        secret: 'test-secret',
      });
      expect(mockRequest.user).toBeDefined();
      expect(mockRequest.user.id).toBe('user-id');
      expect(mockRequest.user.orgs).toHaveLength(1);
      expect(mockRequest.user.orgs[0].orgId).toBe('org-id');
    });

    it('should throw UnauthorizedException if user not found in database', async () => {
      reflector.getAllAndOverride.mockReturnValue(false);
      const context = createMockExecutionContext({
        authorization: 'Bearer valid-token',
      });

      jwtService.verifyAsync.mockResolvedValue({ sub: 'user-id' });
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if token verification fails', async () => {
      reflector.getAllAndOverride.mockReturnValue(false);
      const context = createMockExecutionContext({
        authorization: 'Bearer invalid-token',
      });

      jwtService.verifyAsync.mockRejectedValue(new Error('Invalid token'));

      await expect(guard.canActivate(context)).rejects.toThrow(
        new UnauthorizedException('Invalid or expired token'),
      );
    });

    it('should work with different user roles', async () => {
      reflector.getAllAndOverride.mockReturnValue(false);
      const mockRequest: any = {
        headers: {
          authorization: 'Bearer valid-token',
        },
      };
      const context = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
        getHandler: jest.fn(),
        getClass: jest.fn(),
      } as any;

      const roles = ['TENANT', 'CONTRACTOR', 'OPS'];
      for (const role of roles) {
        const mockUser = {
          id: 'user-id',
          email: 'test@example.com',
          name: 'Test User',
          role,
          landlordId: null,
          orgMemberships: [],
        };

        jwtService.verifyAsync.mockResolvedValue({ sub: 'user-id' });
        (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

        const result = await guard.canActivate(context);

        expect(result).toBe(true);
        expect(mockRequest.user.role).toBe(role);
      }
    });
  });
});
