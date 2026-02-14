import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { ClerkUser } from '../interfaces/clerk-user.interface';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): ClerkUser => {
    const request = ctx.switchToHttp().getRequest<Request>();
    return (request as Request & { auth: ClerkUser }).auth;
  },
);
