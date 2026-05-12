import type { Role, StaffRole, UserStatus } from '@kids/shared';

export interface ProfileContext {
  id: string;
  schoolId: string;
  name: string;
  email: string;
  phone: string;
  role: StaffRole;
  status: UserStatus;
}

export interface ParentContext {
  id: string;
  schoolId: string;
  name: string;
  email: string;
}

export interface AuthContext {
  userId: string;
  email: string | null;
  profile: ProfileContext | null;
  parent?: ParentContext;
}

export function effectiveRole(ctx: AuthContext | undefined): Role | null {
  if (!ctx) return null;
  if (ctx.profile) return ctx.profile.role;
  if (ctx.parent) return 'parent';
  return null;
}
