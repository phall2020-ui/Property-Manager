import {
  Injectable,
  CanActivate,
  ExecutionContext,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Metadata key for specifying the resource type for tenant isolation
 */
export const RESOURCE_TYPE_KEY = 'resourceType';

/**
 * Supported resource types for tenant isolation
 */
export type ResourceType = 'property' | 'tenancy' | 'ticket' | 'invoice' | 'payment';

/**
 * Guard that enforces cross-tenant resource isolation
 * 
 * Returns 404 (not 403) when a user tries to access another landlord's resource
 * to prevent information disclosure about resource existence.
 * 
 * Usage:
 * @ResourceType('property')
 * @Get(':id')
 * async findOne(@Param('id') id: string) { ... }
 */
@Injectable()
export class LandlordResourceGuard implements CanActivate {
  private readonly logger = new Logger(LandlordResourceGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const resourceType = this.reflector.getAllAndOverride<ResourceType>(
      RESOURCE_TYPE_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!resourceType) {
      // No resource type specified, skip this guard
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const resourceId = request.params.id;

    if (!user) {
      this.logger.warn('LandlordResourceGuard: No user in request');
      return false;
    }

    if (!resourceId) {
      // No resource ID in params, skip this guard
      return true;
    }

    // Get user's landlord org IDs
    const landlordOrgIds = user.orgs
      ?.filter((o: any) => o.role === 'LANDLORD')
      .map((o: any) => o.orgId) || [];

    if (landlordOrgIds.length === 0) {
      // User is not a landlord, let RolesGuard handle role-based access
      return true;
    }

    this.logger.debug(
      `Checking ${resourceType} ${resourceId} access for user ${user.id} (orgs: ${landlordOrgIds.join(', ')})`,
    );

    // Check resource ownership based on type
    const ownerOrgId = await this.getResourceOwnerOrgId(resourceType, resourceId);

    if (!ownerOrgId) {
      // Resource doesn't exist - return 404 to hide existence
      this.logger.warn(
        `Resource ${resourceType}:${resourceId} not found`,
      );
      throw new NotFoundException(`${this.capitalizeFirst(resourceType)} not found`);
    }

    if (!landlordOrgIds.includes(ownerOrgId)) {
      // User doesn't own this resource - return 404 to hide existence (tenant isolation)
      this.logger.warn(
        `User ${user.id} attempted to access ${resourceType}:${resourceId} owned by org ${ownerOrgId}`,
      );
      throw new NotFoundException(`${this.capitalizeFirst(resourceType)} not found`);
    }

    // User owns this resource
    this.logger.debug(
      `User ${user.id} authorized to access ${resourceType}:${resourceId}`,
    );
    return true;
  }

  /**
   * Get the ownerOrgId for a resource
   */
  private async getResourceOwnerOrgId(
    resourceType: ResourceType,
    resourceId: string,
  ): Promise<string | null> {
    try {
      switch (resourceType) {
        case 'property': {
          const property = await this.prisma.property.findUnique({
            where: { id: resourceId },
            select: { ownerOrgId: true },
          });
          return property?.ownerOrgId || null;
        }

        case 'tenancy': {
          const tenancy = await this.prisma.tenancy.findUnique({
            where: { id: resourceId },
            include: { property: { select: { ownerOrgId: true } } },
          });
          return tenancy?.property.ownerOrgId || null;
        }

        case 'ticket': {
          const ticket = await this.prisma.ticket.findUnique({
            where: { id: resourceId },
            select: { landlordId: true },
          });
          return ticket?.landlordId || null;
        }

        case 'invoice': {
          const invoice = await this.prisma.invoice.findUnique({
            where: { id: resourceId },
            select: { landlordId: true },
          });
          return invoice?.landlordId || null;
        }

        case 'payment': {
          const payment = await this.prisma.payment.findUnique({
            where: { id: resourceId },
            select: { landlordId: true },
          });
          return payment?.landlordId || null;
        }

        default:
          this.logger.error(`Unknown resource type: ${resourceType}`);
          return null;
      }
    } catch (error) {
      this.logger.error(
        `Error fetching ${resourceType}:${resourceId}: ${error.message}`,
      );
      return null;
    }
  }

  private capitalizeFirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}
