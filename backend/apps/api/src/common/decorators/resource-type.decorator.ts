import { SetMetadata } from '@nestjs/common';
import { RESOURCE_TYPE_KEY } from '../guards/landlord-resource.guard';
import type { ResourceType as ResourceTypeEnum } from '../guards/landlord-resource.guard';

/**
 * Decorator to specify the resource type for tenant isolation
 * 
 * Used with LandlordResourceGuard to enforce cross-tenant access control.
 * When a user tries to access another landlord's resource, returns 404 instead of 403
 * to prevent information disclosure.
 * 
 * @param resourceType - The type of resource being protected
 * 
 * @example
 * @ResourceType('property')
 * @Get(':id')
 * async findOne(@Param('id') id: string) { ... }
 */
export const ResourceType = (resourceType: ResourceTypeEnum) =>
  SetMetadata(RESOURCE_TYPE_KEY, resourceType);
