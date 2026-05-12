import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Wraps two Supabase clients:
 *  - `admin`  uses the service-role key. The API uses this for all data access
 *             so RBAC/school-scoping is centralized in the NestJS layer.
 *  - `anon`   uses the anon key. Only used to verify user JWTs (auth.getUser).
 */
@Injectable()
export class SupabaseService implements OnModuleInit {
  private readonly logger = new Logger(SupabaseService.name);
  private _admin!: SupabaseClient;
  private _anon!: SupabaseClient;

  onModuleInit(): void {
    const url = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const anonKey = process.env.SUPABASE_ANON_KEY;

    if (!url || !serviceKey || !anonKey) {
      this.logger.warn(
        'Supabase env vars missing. Set SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY.',
      );
    }

    this._admin = createClient(url ?? '', serviceKey ?? '', {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    this._anon = createClient(url ?? '', anonKey ?? '', {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  get admin(): SupabaseClient {
    return this._admin;
  }

  get anon(): SupabaseClient {
    return this._anon;
  }

  /** Verify a bearer JWT and return the auth user id (or null). */
  async verifyJwt(token: string): Promise<{ id: string; email: string | null } | null> {
    const { data, error } = await this._anon.auth.getUser(token);
    if (error || !data?.user) return null;
    return { id: data.user.id, email: data.user.email ?? null };
  }
}
