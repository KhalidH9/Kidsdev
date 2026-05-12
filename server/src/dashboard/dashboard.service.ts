import { Injectable } from '@nestjs/common';
import type { DashboardStat, DashboardSummaryDto, Role } from '@kids/shared';
import { SupabaseService } from '../supabase/supabase.service';
import type { AuthContext } from '../common/types/auth-context';
import { effectiveRole } from '../common/types/auth-context';

@Injectable()
export class DashboardService {
  constructor(private readonly supabase: SupabaseService) {}

  async summary(user: AuthContext): Promise<DashboardSummaryDto> {
    const role = effectiveRole(user);
    const schoolId = user.profile?.schoolId ?? user.parent?.schoolId;
    if (!role || !schoolId) {
      return { schoolName: '', stats: [], recentLogs: [] };
    }

    const { data: school } = await this.supabase.admin
      .from('schools')
      .select('name')
      .eq('id', schoolId)
      .maybeSingle();
    const schoolName = (school?.name as string | undefined) ?? '';

    const stats: DashboardStat[] = [];
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    if (role === 'admin') {
      const [children, staff, kidMode, logsToday] = await Promise.all([
        this.countChildren(schoolId, 'active'),
        this.countStaff(schoolId),
        this.countOpenKidMode(schoolId),
        this.countLogsSince(schoolId, todayStart.toISOString()),
      ]);
      stats.push({ key: 'children', label: 'Active children', value: children });
      stats.push({ key: 'staff', label: 'Staff users', value: staff });
      stats.push({ key: 'kidMode', label: 'Open Kid Mode sessions', value: kidMode });
      stats.push({ key: 'logsToday', label: 'Logs today', value: logsToday });
    } else if (role === 'specialist' && user.profile) {
      const [caseload, kidMode, logsToday] = await Promise.all([
        this.countCaseload(user.profile.id, 'specialist'),
        this.countOpenKidMode(schoolId),
        this.countLogsSince(schoolId, todayStart.toISOString()),
      ]);
      stats.push({ key: 'caseload', label: 'My caseload', value: caseload });
      stats.push({ key: 'logsToday', label: 'Logs today', value: logsToday });
      stats.push({ key: 'kidMode', label: 'Open Kid Mode', value: kidMode });
      stats.push({ key: 'children', label: 'Active children', value: await this.countChildren(schoolId, 'active') });
    } else if (role === 'teacher' && user.profile) {
      const [students, logsToday, kidMode] = await Promise.all([
        this.countCaseload(user.profile.id, 'teacher'),
        this.countLogsByTeacherSince(user.profile.id, todayStart.toISOString()),
        this.countOpenKidMode(schoolId),
      ]);
      stats.push({ key: 'students', label: 'My students', value: students });
      stats.push({ key: 'logsToday', label: 'Logs today', value: logsToday });
      stats.push({ key: 'kidMode', label: 'Open Kid Mode', value: kidMode });
    }

    const recentLogs = await this.recentLogs(schoolId, role, user);

    return { schoolName, stats, recentLogs };
  }

  private async countChildren(
    schoolId: string,
    status?: 'active' | 'inactive',
  ): Promise<number> {
    let q = this.supabase.admin
      .from('children')
      .select('id', { count: 'exact', head: true })
      .eq('school_id', schoolId);
    if (status) q = q.eq('status', status);
    const { count } = await q;
    return count ?? 0;
  }

  private async countStaff(schoolId: string): Promise<number> {
    const { count } = await this.supabase.admin
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('school_id', schoolId);
    return count ?? 0;
  }

  private async countOpenKidMode(schoolId: string): Promise<number> {
    // Open sessions whose child belongs to this school.
    const { data: children } = await this.supabase.admin
      .from('children')
      .select('id')
      .eq('school_id', schoolId);
    const ids = (children ?? []).map((c) => c.id);
    if (ids.length === 0) return 0;
    const { count } = await this.supabase.admin
      .from('kid_mode_sessions')
      .select('id', { count: 'exact', head: true })
      .in('child_id', ids)
      .eq('status', 'open');
    return count ?? 0;
  }

  private async countLogsSince(schoolId: string, sinceIso: string): Promise<number> {
    const { data: children } = await this.supabase.admin
      .from('children')
      .select('id')
      .eq('school_id', schoolId);
    const ids = (children ?? []).map((c) => c.id);
    if (ids.length === 0) return 0;
    const { count } = await this.supabase.admin
      .from('behavior_logs')
      .select('id', { count: 'exact', head: true })
      .in('child_id', ids)
      .gte('occurred_at', sinceIso);
    return count ?? 0;
  }

  private async countLogsByTeacherSince(
    teacherId: string,
    sinceIso: string,
  ): Promise<number> {
    const { count } = await this.supabase.admin
      .from('behavior_logs')
      .select('id', { count: 'exact', head: true })
      .eq('teacher_id', teacherId)
      .gte('occurred_at', sinceIso);
    return count ?? 0;
  }

  private async countCaseload(
    assigneeId: string,
    type: 'specialist' | 'teacher',
  ): Promise<number> {
    const { count } = await this.supabase.admin
      .from('child_assignments')
      .select('id', { count: 'exact', head: true })
      .eq('assignee_id', assigneeId)
      .eq('type', type);
    return count ?? 0;
  }

  private async recentLogs(
    schoolId: string,
    role: Role,
    user: AuthContext,
  ): Promise<DashboardSummaryDto['recentLogs']> {
    let childIds: string[] = [];
    if (role === 'admin' || role === 'specialist') {
      const { data } = await this.supabase.admin
        .from('children')
        .select('id')
        .eq('school_id', schoolId);
      childIds = (data ?? []).map((c) => c.id);
    } else if (role === 'teacher' && user.profile) {
      const { data } = await this.supabase.admin
        .from('child_assignments')
        .select('child_id')
        .eq('assignee_id', user.profile.id)
        .eq('type', 'teacher');
      childIds = (data ?? []).map((c) => c.child_id);
    }
    if (childIds.length === 0) return [];

    const { data: logs } = await this.supabase.admin
      .from('behavior_logs')
      .select('id, child_id, event_type, occurred_at, notes')
      .in('child_id', childIds)
      .order('occurred_at', { ascending: false })
      .limit(8);

    const ids = Array.from(new Set((logs ?? []).map((l) => l.child_id)));
    const names = new Map<string, string>();
    if (ids.length > 0) {
      const { data: kids } = await this.supabase.admin
        .from('children')
        .select('id, name')
        .in('id', ids);
      for (const k of (kids ?? []) as { id: string; name: string }[]) {
        names.set(k.id, k.name);
      }
    }

    return (logs ?? []).map((l) => ({
      id: l.id as string,
      childId: l.child_id as string,
      childName: names.get(l.child_id as string) ?? '—',
      eventType: l.event_type as string,
      occurredAt: l.occurred_at as string,
      notes: (l.notes as string | null) ?? null,
    }));
  }
}
