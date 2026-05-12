import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import type { AuthContext } from '../common/types/auth-context';
import type { AuditLogDto, Paginated } from '@kids/shared';
import { paginate, rangeFor } from '../common/pagination/pagination.util';

export interface AuditWriteInput {
  actor: AuthContext;
  action: string;
  entity: string;
  entityId?: string | null;
  metadata?: Record<string, unknown> | null;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);
  constructor(private readonly supabase: SupabaseService) {}

  async record(input: AuditWriteInput): Promise<void> {
    const schoolId = input.actor.profile?.schoolId ?? input.actor.parent?.schoolId ?? null;
    const actorName = input.actor.profile?.name ?? input.actor.parent?.name ?? input.actor.email ?? 'unknown';
    const { error } = await this.supabase.admin.from('audit_logs').insert({
      school_id: schoolId,
      actor_id: input.actor.profile?.id ?? null,
      actor_name: actorName,
      action: input.action,
      entity: input.entity,
      entity_id: input.entityId ?? null,
      metadata: input.metadata ?? null,
    });
    if (error) this.logger.error(`Audit insert failed: ${error.message}`);
  }

  async list(
    schoolId: string,
    page: number,
    pageSize: number,
    entity?: string,
  ): Promise<Paginated<AuditLogDto>> {
    const { from, to } = rangeFor({ page, pageSize });
    let q = this.supabase.admin
      .from('audit_logs')
      .select('*', { count: 'exact' })
      .eq('school_id', schoolId)
      .order('created_at', { ascending: false })
      .range(from, to);
    if (entity) q = q.eq('entity', entity);

    const { data, error, count } = await q;
    if (error) throw new Error(error.message);

    const rows: AuditLogDto[] = (data ?? []).map((r) => ({
      id: r.id,
      schoolId: r.school_id,
      actorId: r.actor_id,
      actorName: r.actor_name,
      action: r.action,
      entity: r.entity,
      entityId: r.entity_id,
      metadata: r.metadata,
      createdAt: r.created_at,
    }));
    return paginate(rows, count ?? rows.length, { page, pageSize });
  }
}
