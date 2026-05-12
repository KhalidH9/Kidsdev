import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Role } from '@kids/shared';
import { PUBLIC_KEY, ROLES_KEY } from '../decorators/roles.decorator';
import { effectiveRole, type AuthContext } from '../types/auth-context';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const required = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const req = context.switchToHttp().getRequest<{ auth?: AuthContext }>();
    const role = effectiveRole(req.auth);
    if (!role || !required.includes(role)) {
      throw new ForbiddenException('Insufficient role');
    }
    return true;
  }
}
