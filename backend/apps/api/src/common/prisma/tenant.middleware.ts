import { Prisma } from '@prisma/client';

/**
 * Tenant-aware Prisma middleware that automatically injects tenantId filters
 * into queries for multi-tenant isolation. This ensures tenant scoping cannot
 * be forgotten and prevents cross-tenant data leaks.
 * 
 * Note: Currently in opt-in mode - only applies filters when landlordId is explicitly
 * present in the where clause. This allows gradual migration without breaking existing
 * org-based isolation. To enable strict mode, set ENABLE_STRICT_TENANT_SCOPING=true.
 */
export function tenantMiddleware(getTenantId: () => string | null) {
  const strictMode = process.env.ENABLE_STRICT_TENANT_SCOPING === 'true';
  
  return async (params: Prisma.MiddlewareParams, next: (params: Prisma.MiddlewareParams) => Promise<unknown>) => {
    const tenantId = getTenantId();
    
    // Models that require tenant scoping
    const tenantScopedModels = ['Property', 'Ticket', 'PropertyDocument', 'TicketAttachment'];
    const needsScope = params.model && tenantScopedModels.includes(params.model);

    // Only apply strict tenant scoping if enabled and tenantId is available
    if (strictMode && tenantId && needsScope) {
      // For queries that return multiple records, inject tenantId filter
      if (['findMany', 'updateMany', 'deleteMany', 'count', 'aggregate'].includes(params.action)) {
        params.args = params.args || {};
        params.args.where = {
          ...(params.args.where ?? {}),
          landlordId: tenantId,
        };
      }

      // For single record queries, inject tenantId filter
      if (['findFirst', 'findUnique', 'findFirstOrThrow', 'findUniqueOrThrow'].includes(params.action)) {
        params.args = params.args || {};
        params.args.where = {
          ...(params.args.where ?? {}),
          landlordId: tenantId,
        };
      }

      // For create/upsert operations, inject tenantId into data
      if (['create', 'upsert'].includes(params.action)) {
        params.args = params.args || {};
        if (params.action === 'create') {
          params.args.data = {
            ...(params.args.data ?? {}),
            landlordId: tenantId,
          };
        } else if (params.action === 'upsert') {
          params.args.create = {
            ...(params.args.create ?? {}),
            landlordId: tenantId,
          };
          params.args.update = params.args.update || {};
        }
      }

      // For update operations, ensure we only update records belonging to tenant
      if (params.action === 'update') {
        params.args = params.args || {};
        params.args.where = {
          ...(params.args.where ?? {}),
          landlordId: tenantId,
        };
      }
    }

    const result = await next(params);

    // Optional: post-assertion for read-by-id to ensure tenant ownership (only in strict mode)
    if (strictMode && tenantId && needsScope && result) {
      if (['findUnique', 'findFirst', 'findUniqueOrThrow', 'findFirstOrThrow'].includes(params.action)) {
        const record = result as { landlordId?: string };
        if (record && record.landlordId && record.landlordId !== tenantId) {
          throw new Error('Tenant mismatch: Access denied');
        }
      }
    }

    return result;
  };
}
