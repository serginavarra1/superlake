import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { verifyToken } from '@clerk/backend';
import { Request } from 'express';
import { IS_PUBLIC_KEY } from '../../common/decorators/public.decorator';
import { ClerkUser } from '../interfaces/clerk-user.interface';

@Injectable()
export class ClerkAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException('Missing authorization token');
    }

    try {
      const payload = await verifyToken(token, {
        secretKey: this.configService.get<string>('CLERK_SECRET_KEY'),
        authorizedParties: this.getAuthorizedParties(),
      });

      const auth: ClerkUser = {
        userId: payload.sub,
        sessionId: payload.sid,
        orgId: payload.org_id,
        orgRole: payload.org_role,
      };

      (request as Request & { auth: ClerkUser }).auth = auth;
      return true;
    } catch {
      throw new UnauthorizedException('Invalid authorization token');
    }
  }

  private extractToken(request: Request): string | undefined {
    const authorization = request.headers.authorization;
    if (!authorization) return undefined;

    const [type, token] = authorization.split(' ');
    return type === 'Bearer' ? token : undefined;
  }

  private getAuthorizedParties(): string[] | undefined {
    const parties = this.configService.get<string>('CLERK_AUTHORIZED_PARTIES');
    return parties ? parties.split(',').map((p) => p.trim()) : undefined;
  }
}
