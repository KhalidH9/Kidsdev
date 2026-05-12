import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { SupabaseService } from '../../supabase/supabase.service';
import type { AuthContext } from '../types/auth-context';

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  private readonly logger = new Logger(AuthMiddleware.name);
  constructor(private readonly supabase: SupabaseService) {}

  async use(req: Request, _res: Response, next: NextFunction): Promise<void> {
    const header = req.headers.authorization ?? '';
    const token = header.startsWith('Bearer ') ? header.slice('Bearer '.length).trim() : null;
    if (!token) return next();

    const authUser = await this.supabase.verifyJwt(token);
    if (!authUser) return next();

    // Load staff profile (if any). Parents do not have a staff profile.
    const { data: profile, error } = await this.supabase.admin
      .from('profiles')
      .select('id, school_id, name, email, phone, role, status')
      .eq('id', authUser.id)
      .maybeSingle();

    if (error) {
      this.logger.error(`Profile lookup failed: ${error.message}`);
    }

    if (profile && profile.status === 'inactive') {
      // Inactive: leave req.auth undefined → guard will reject.
      return next();
    }

    const ctx: AuthContext = {
      userId: authUser.id,
      email: authUser.email ?? profile?.email ?? null,
      profile: profile
        ? {
            id: profile.id,
            schoolId: profile.school_id,
            name: profile.name,
            email: profile.email,
            phone: profile.phone,
            role: profile.role,
            status: profile.status,
          }
        : null,
    };

    // If not a staff profile, check if this auth user is a parent.
    if (!ctx.profile) {
      const { data: parent } = await this.supabase.admin
        .from('parents')
        .select('id, school_id, name, email, status')
        .eq('auth_user_id', authUser.id)
        .maybeSingle();
      if (parent && parent.status === 'active') {
        ctx.parent = {
          id: parent.id,
          schoolId: parent.school_id,
          name: parent.name,
          email: parent.email,
        };
      }
    }

    (req as Request & { auth?: AuthContext }).auth = ctx;
    next();
  }
}
