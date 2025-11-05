import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { ROLES_KEY } from '../decorators/roles.decorator';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  const createMockContext = (user: any, requiredRoles?: string[]): ExecutionContext => {
    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as ExecutionContext;

    if (requiredRoles) {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(requiredRoles);
    } else {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(null);
    }

    return mockContext;
  };

  describe('canActivate', () => {
    it('should allow access when no roles are required', () => {
      const context = createMockContext({ id: 'user-1', orgs: [] });
      expect(guard.canActivate(context)).toBe(true);
    });

    it('should allow access when user has the required role', () => {
      const user = {
        id: 'user-1',
        orgs: [
          { orgId: 'org-1', role: 'LANDLORD' },
        ],
      };
      const context = createMockContext(user, ['LANDLORD']);
      expect(guard.canActivate(context)).toBe(true);
    });

    it('should allow access when user has one of multiple required roles', () => {
      const user = {
        id: 'user-1',
        orgs: [
          { orgId: 'org-1', role: 'TENANT' },
        ],
      };
      const context = createMockContext(user, ['LANDLORD', 'TENANT']);
      expect(guard.canActivate(context)).toBe(true);
    });

    it('should allow access when user has role in any org', () => {
      const user = {
        id: 'user-1',
        orgs: [
          { orgId: 'org-1', role: 'TENANT' },
          { orgId: 'org-2', role: 'LANDLORD' },
        ],
      };
      const context = createMockContext(user, ['LANDLORD']);
      expect(guard.canActivate(context)).toBe(true);
    });

    it('should deny access when user does not have required role', () => {
      const user = {
        id: 'user-1',
        orgs: [
          { orgId: 'org-1', role: 'TENANT' },
        ],
      };
      const context = createMockContext(user, ['LANDLORD']);
      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should deny access when user has no orgs', () => {
      const user = {
        id: 'user-1',
        orgs: [],
      };
      const context = createMockContext(user, ['LANDLORD']);
      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should deny access when user is not loaded', () => {
      const context = createMockContext(null, ['LANDLORD']);
      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should deny access when user has undefined orgs', () => {
      const user = { id: 'user-1' };
      const context = createMockContext(user, ['LANDLORD']);
      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });
  });
});
