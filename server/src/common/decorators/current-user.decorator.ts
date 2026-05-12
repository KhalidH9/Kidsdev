import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AuthContext } from '../types/auth-context';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthContext => {
    const req = ctx.switchToHttp().getRequest<{ auth?: AuthContext }>();
    if (!req.auth) {
      throw new Error('No auth context: AuthGuard should have rejected the request.');
    }
    return req.auth;
  },
);
