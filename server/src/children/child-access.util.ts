import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { effectiveRole, type AuthContext } from '../common/types/auth-context';

/**
 * Centralized child authorization check used by child-scoped resources.
 * - admin/specialist: any child in their school
 * - teacher: only children they are assigned to
 * - parent: only children they are linked to
 */
export async function assertChildAccess(
  supabase: SupabaseService,
  user: AuthContext,
  childId: string,
): Promise<{ schoolId: string }> {
  const role = effectiveRole(user);
  const schoolId = user.profile?.schoolId ?? user.parent?.schoolId;
  if (!role || !schoolId) throw new ForbiddenException();

  const { data: child, error } = await supabase.admin
    .from('children')
    .select('id, school_id')
    .eq('id', childId)
    .eq('school_id', schoolId)
    .maybeSingle();
  if (error) throw new ForbiddenException(error.message);
  if (!child) throw new NotFoundException('Child not found');

  if (role === 'admin' || role === 'specialist') return { schoolId };

  if (role === 'teacher' && user.profile) {
    const { data } = await supabase.admin
      .from('child_assignments')
      .select('id')
      .eq('child_id', childId)
      .eq('assignee_id', user.profile.id)
      .eq('type', 'teacher')
      .maybeSingle();
    if (!data) throw new ForbiddenException('Not assigned to this child');
    return { schoolId };
  }

  if (role === 'parent' && user.parent) {
    const { data } = await supabase.admin
      .from('child_assignments')
      .select('id')
      .eq('child_id', childId)
      .eq('assignee_id', user.parent.id)
      .eq('type', 'parent')
      .maybeSingle();
    if (!data) throw new ForbiddenException('Not linked to this child');
    return { schoolId };
  }

  throw new ForbiddenException();
}
