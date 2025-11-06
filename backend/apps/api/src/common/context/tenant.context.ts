import { AsyncLocalStorage } from 'async_hooks';

/**
 * Tenant context storage using AsyncLocalStorage for request-scoped tenant tracking.
 * This allows middleware and guards to set the tenant ID, which can then be
 * retrieved anywhere in the request lifecycle without passing it through parameters.
 */
interface TenantContextData {
  tenantId: string | null;
  userId?: string;
}

class TenantContextManager {
  private storage = new AsyncLocalStorage<TenantContextData>();

  /**
   * Run a function with a specific tenant context
   */
  run<T>(tenantId: string | null, userId: string | undefined, fn: () => T): T {
    return this.storage.run({ tenantId, userId }, fn);
  }

  /**
   * Get the current tenant ID from the async context
   */
  current(): string | null {
    return this.storage.getStore()?.tenantId ?? null;
  }

  /**
   * Get the current user ID from the async context
   */
  getUserId(): string | undefined {
    return this.storage.getStore()?.userId;
  }
}

export const TenantContext = new TenantContextManager();
