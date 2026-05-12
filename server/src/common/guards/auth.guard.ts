import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PUBLIC_KEY } from '../decorators/roles.decorator';
import type { AuthContext } from '../types/auth-context';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const req = context.switchToHttp().getRequest<{ auth?: AuthContext }>();
    if (!req.auth) {
      throw new UnauthorizedException('Authentication required');
    }
    // Inactive staff: profile is loaded only if active; so absence here for a logged-in
    // non-parent means inactive or missing profile → block.
    if (!req.auth.profile && !req.auth.parent) {
      throw new UnauthorizedException('No active profile for this user');
    }
    return true;
  }
}
