import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

/**
 * Guard that checks if the authenticated user has one of the required roles
 * Works with both user.role (legacy) and user.orgs[].role (new multi-tenant system)
 */
@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);
  
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

    // Log user object structure for debugging
    this.logger.debug(`RolesGuard - user.orgs: ${JSON.stringify(user.orgs)}, user.role: ${user.role}`);

    // Check legacy user.role field (case-insensitive)
    if (user.role) {
      const hasLegacyRole = requiredRoles.some(required => 
        required.toUpperCase() === user.role.toUpperCase()
      );
      if (hasLegacyRole) {
        return true;
      }
    }

    // Check org memberships (new multi-tenant system)
    // Also check if orgs is in the JWT payload (from token)
    const orgs = user.orgs || (user as any).orgs || [];
    if (Array.isArray(orgs) && orgs.length > 0) {
      const userRoles = orgs.map((org: any) => org.role).filter(Boolean);
      this.logger.debug(`Checking roles - Required: ${requiredRoles.join(', ')}, User has: ${userRoles.join(', ')}`);
      const hasRequiredRole = orgs.some((org: any) => {
        const role = org.role;
        if (!role) return false;
        // Case-insensitive comparison for robustness
        return requiredRoles.some(required => 
          required.toUpperCase() === role.toUpperCase()
        );
      });
      if (hasRequiredRole) {
        return true;
      }
    }

    // Debug: log what we're checking
    const userRoles = user.orgs?.map((org: any) => org.role) || [];
    this.logger.warn(`Role check failed - Required: ${requiredRoles.join(', ')}, User has: ${userRoles.join(', ') || 'none'}, user.orgs: ${JSON.stringify(user.orgs)}`);
    throw new ForbiddenException(
      `Insufficient permissions. Required: ${requiredRoles.join(', ')}, User has: ${userRoles.join(', ') || 'none'}`
    );
  }
}
