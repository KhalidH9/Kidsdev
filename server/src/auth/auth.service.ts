import { BadRequestException, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { SupabaseService } from '../supabase/supabase.service';

const RATE_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS = 5;
const TOKEN_TTL_MS = 10 * 60 * 1000; // 10 minutes — token expires after 10 min

interface RateEntry {
  count: number;
  resetAt: number;
}

interface ResetEntry {
  authUserId: string;
  expiresAt: number;
}

@Injectable()
export class AuthService {
  /** Per-email attempt counters. Keyed by lowercase email. */
  private readonly rateLimits = new Map<string, RateEntry>();

  /** Single-use tokens issued after successful identity verification. */
  private readonly resetTokens = new Map<string, ResetEntry>();

  constructor(private readonly supabase: SupabaseService) {}

  /**
   * Step 1 — Verify identity by matching email + phone against profiles or parents.
   * Returns a short-lived reset token on success. Throws on mismatch or rate limit.
   */
  async verifyForgotPassword(email: string, phone: string): Promise<{ token: string }> {
    const key = email.toLowerCase();
    const now = Date.now();

    // ── Rate limiting ─────────────────────────────────────────────────────────
    const rateEntry = this.rateLimits.get(key);
    if (rateEntry && now < rateEntry.resetAt) {
      if (rateEntry.count >= MAX_ATTEMPTS) {
        throw new HttpException(
          "You've tried too many times. Wait 15 minutes and try again.",
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
      rateEntry.count += 1;
    } else {
      // Window expired or first attempt — open a fresh window.
      this.rateLimits.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS });
    }

    // ── Lookup: staff profiles ────────────────────────────────────────────────
    let authUserId: string | null = null;

    const { data: profile } = await this.supabase.admin
      .from('profiles')
      .select('id')
      .eq('email', key)
      .eq('phone', phone)
      .maybeSingle();

    if (profile) {
      authUserId = profile.id;
    } else {
      // ── Lookup: parent accounts ─────────────────────────────────────────────
      const { data: parent } = await this.supabase.admin
        .from('parents')
        .select('auth_user_id')
        .eq('email', key)
        .eq('phone', phone)
        .maybeSingle();

      if (parent?.auth_user_id) {
        authUserId = parent.auth_user_id as string;
      }
    }

    if (!authUserId) {
      throw new BadRequestException(
        "We couldn't find an account with that email and phone number.",
      );
    }

    // ── Issue a single-use reset token ────────────────────────────────────────
    const token = randomUUID();
    this.resetTokens.set(token, { authUserId, expiresAt: now + TOKEN_TTL_MS });
    return { token };
  }

  /**
   * Step 2 — Set a new password using the token from step 1.
   * The token is invalidated immediately after use.
   */
  async resetPassword(token: string, password: string): Promise<void> {
    const entry = this.resetTokens.get(token);
    if (!entry || Date.now() > entry.expiresAt) {
      throw new BadRequestException('This reset link has expired. Please start over.');
    }

    const { error } = await this.supabase.admin.auth.admin.updateUserById(entry.authUserId, {
      password,
    });

    if (error) {
      throw new BadRequestException('Failed to update password. Please try again.');
    }

    // Consume the token — one use only.
    this.resetTokens.delete(token);
  }
}
