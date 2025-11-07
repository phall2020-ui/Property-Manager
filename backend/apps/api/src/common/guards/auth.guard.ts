import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger = new Logger(AuthGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const path = request.url;
    const method = request.method;
    
    // Log incoming request for debugging
    this.logger.debug(`Authenticating ${method} ${path}`);
    
    const authorization = request.headers['authorization'];
    if (!authorization) {
      this.logger.warn(`Missing Authorization header for ${method} ${path}`);
      throw new UnauthorizedException('Missing Authorization header');
    }
    
    const [type, token] = authorization.split(' ');
    if (type !== 'Bearer' || !token) {
      this.logger.warn(`Invalid Authorization header format for ${method} ${path}`);
      throw new UnauthorizedException('Invalid Authorization header');
    }
    
    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>('app.jwt.accessSecret'),
      });
      
      this.logger.debug(`JWT verified for user ${payload.sub}`);
      
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        include: {
          orgMemberships: {
            include: {
              org: true,
            },
          },
        },
      });
      
      if (!user) {
        this.logger.warn(`User ${payload.sub} not found in database`);
        throw new UnauthorizedException('User not found');
      }
      
      // attach user with orgs to request
      request.user = {
        ...user,
        sub: payload.sub, // Add JWT subject for consistency
        orgs: user.orgMemberships.map((m) => ({
          orgId: m.orgId,
          orgName: m.org.name,
          role: m.role,
        })),
      };
      
      // Log successful authentication with user context
      this.logger.log({
        message: 'User authenticated successfully',
        userId: user.id,
        email: user.email,
        orgCount: user.orgMemberships.length,
        roles: request.user.orgs.map((o: any) => o.role).join(', '),
        path: `${method} ${path}`,
      });
      
      return true;
    } catch (err) {
      this.logger.error(`Authentication failed for ${method} ${path}: ${err.message}`);
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}