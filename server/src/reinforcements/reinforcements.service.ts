import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { paginate, rangeFor } from '../common/pagination/pagination.util';
import type {
  CreateReinforcementInput,
  ListQuery,
  Paginated,
  ReinforcementDto,
} from '@kids/shared';

type Row = {
  id: string;
  child_id: string;
  title: string;
  description: string | null;
  schedule_type: 'continuous' | 'variable_ratio';
  vr_min: number | null;
  vr_max: number | null;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
};

const toDto = (r: Row): ReinforcementDto => ({
  id: r.id,
  childId: r.child_id,
  title: r.title,
  description: r.description,
  scheduleType: r.schedule_type,
  vrMin: r.vr_min,
  vrMax: r.vr_max,
  status: r.status,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

@Injectable()
export class ReinforcementsService {
  constructor(private readonly supabase: SupabaseService) {}

  async listByChild(childId: string, query: ListQuery): Promise<Paginated<ReinforcementDto>> {
    const { from, to } = rangeFor(query);
    let q = this.supabase.admin
      .from('reinforcements')
      .select('*', { count: 'exact' })
      .eq('child_id', childId)
      .order('created_at', { ascending: false })
      .range(from, to);
    if (query.status) q = q.eq('status', query.status);
    const { data, error, count } = await q;
    if (error) throw new BadRequestException(error.message);
    return paginate((data ?? []).map(toDto), count ?? 0, query);
  }

  async create(input: CreateReinforcementInput, createdBy: string): Promise<ReinforcementDto> {
    const { data, error } = await this.supabase.admin
      .from('reinforcements')
      .insert({
        child_id: input.childId,
        title: input.title,
        description: input.description ?? null,
        schedule_type: input.scheduleType,
        vr_min: input.vrMin ?? null,
        vr_max: input.vrMax ?? null,
        status: input.status,
        created_by: createdBy,
      })
      .select('*')
      .single();
    if (error) throw new BadRequestException(error.message);
    return toDto(data);
  }

  async update(id: string, input: Partial<CreateReinforcementInput>): Promise<ReinforcementDto> {
    const patch: Record<string, unknown> = {};
    if (input.title !== undefined) patch.title = input.title;
    if (input.description !== undefined) patch.description = input.description;
    if (input.scheduleType !== undefined) patch.schedule_type = input.scheduleType;
    if (input.vrMin !== undefined) patch.vr_min = input.vrMin;
    if (input.vrMax !== undefined) patch.vr_max = input.vrMax;
    if (input.status !== undefined) patch.status = input.status;
    const { data, error } = await this.supabase.admin
      .from('reinforcements').update(patch).eq('id', id).select('*').single();
    if (error) throw new BadRequestException(error.message);
    if (!data) throw new NotFoundException('Reinforcement not found');
    return toDto(data);
  }

  async remove(id: string): Promise<void> {
    const { error } = await this.supabase.admin.from('reinforcements').delete().eq('id', id);
    if (error) throw new BadRequestException(error.message);
  }
}
