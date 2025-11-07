import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

/**
 * Guard that checks if the authenticated user has one of the required roles
 * Works with both user.role (legacy) and user.orgs[].role (new multi-tenant system)
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }
    
    const { user } = context.switchToHttp().getRequest();
    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // Check legacy user.role field
    if (user.role && requiredRoles.includes(user.role)) {
      return true;
    }

    // Check org memberships (new multi-tenant system)
    if (user.orgs && Array.isArray(user.orgs)) {
      const hasRequiredRole = user.orgs.some((org: any) => 
        requiredRoles.includes(org.role)
      );
      if (hasRequiredRole) {
        return true;
      }
    }

    throw new ForbiddenException('Insufficient permissions');
  }
}
