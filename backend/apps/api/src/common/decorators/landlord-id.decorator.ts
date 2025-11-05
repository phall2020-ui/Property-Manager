import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Decorator to extract landlordId from JWT payload (Step 1 requirement)
 * Usage: @LandlordId() landlordId: string
 */
export const LandlordId = createParamDecorator((data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest();
  return request.user?.landlordId;
});
