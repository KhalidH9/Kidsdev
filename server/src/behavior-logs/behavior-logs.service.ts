import { BadRequestException, Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { paginate, rangeFor } from '../common/pagination/pagination.util';
import type {
  BehaviorLogDto,
  CreateBehaviorLogInput,
  ListQuery,
  Paginated,
} from '@kids/shared';

type Row = {
  id: string;
  child_id: string;
  teacher_id: string;
  occurred_at: string;
  event_type: string;
  response: string | null;
  prompt_level: string | null;
  intensity: string | null;
  duration_sec: number | null;
  location: string | null;
  notes: string | null;
  created_at: string;
};

const toDto = (r: Row): BehaviorLogDto => ({
  id: r.id,
  childId: r.child_id,
  teacherId: r.teacher_id,
  occurredAt: r.occurred_at,
  eventType: r.event_type,
  response: r.response,
  promptLevel: r.prompt_level,
  intensity: r.intensity,
  durationSec: r.duration_sec,
  location: r.location,
  notes: r.notes,
  createdAt: r.created_at,
});

@Injectable()
export class BehaviorLogsService {
  constructor(private readonly supabase: SupabaseService) {}

  async listByChild(childId: string, query: ListQuery): Promise<Paginated<BehaviorLogDto>> {
    const { from, to } = rangeFor(query);
    const { data, error, count } = await this.supabase.admin
      .from('behavior_logs')
      .select('*', { count: 'exact' })
      .eq('child_id', childId)
      .order('occurred_at', { ascending: false })
      .range(from, to);
    if (error) throw new BadRequestException(error.message);
    return paginate((data ?? []).map(toDto), count ?? 0, query);
  }

  async create(teacherId: string, input: CreateBehaviorLogInput): Promise<BehaviorLogDto> {
    const { data, error } = await this.supabase.admin
      .from('behavior_logs')
      .insert({
        child_id: input.childId,
        teacher_id: teacherId,
        occurred_at: input.occurredAt ?? new Date().toISOString(),
        event_type: input.eventType,
        response: input.response ?? null,
        prompt_level: input.promptLevel ?? null,
        intensity: input.intensity ?? null,
        duration_sec: input.durationSec ?? null,
        location: input.location ?? null,
        notes: input.notes ?? null,
      })
      .select('*')
      .single();
    if (error) throw new BadRequestException(error.message);
    return toDto(data);
  }
}
