import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { paginate, rangeFor } from '../common/pagination/pagination.util';
import type {
  CreateGoalInput,
  GoalDto,
  ListQuery,
  Paginated,
  UpdateGoalInput,
} from '@kids/shared';

type Row = {
  id: string;
  child_id: string;
  title: string;
  description: string | null;
  target: string | null;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
};

const toDto = (r: Row): GoalDto => ({
  id: r.id,
  childId: r.child_id,
  title: r.title,
  description: r.description,
  target: r.target,
  status: r.status,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

@Injectable()
export class GoalsService {
  constructor(private readonly supabase: SupabaseService) {}

  async listByChild(childId: string, query: ListQuery): Promise<Paginated<GoalDto>> {
    const { from, to } = rangeFor(query);
    let q = this.supabase.admin
      .from('goals')
      .select('*', { count: 'exact' })
      .eq('child_id', childId)
      .order('created_at', { ascending: false })
      .range(from, to);
    if (query.status) q = q.eq('status', query.status);
    if (query.search) q = q.ilike('title', `%${query.search}%`);
    const { data, error, count } = await q;
    if (error) throw new BadRequestException(error.message);
    return paginate((data ?? []).map(toDto), count ?? 0, query);
  }

  async create(input: CreateGoalInput, createdBy: string): Promise<GoalDto> {
    const { data, error } = await this.supabase.admin
      .from('goals')
      .insert({
        child_id: input.childId,
        title: input.title,
        description: input.description ?? null,
        target: input.target ?? null,
        status: input.status,
        created_by: createdBy,
      })
      .select('*')
      .single();
    if (error) throw new BadRequestException(error.message);
    return toDto(data);
  }

  async update(id: string, input: UpdateGoalInput): Promise<GoalDto> {
    const patch: Record<string, unknown> = {};
    if (input.title !== undefined) patch.title = input.title;
    if (input.description !== undefined) patch.description = input.description;
    if (input.target !== undefined) patch.target = input.target;
    if (input.status !== undefined) patch.status = input.status;
    const { data, error } = await this.supabase.admin
      .from('goals').update(patch).eq('id', id).select('*').single();
    if (error) throw new BadRequestException(error.message);
    if (!data) throw new NotFoundException('Goal not found');
    return toDto(data);
  }

  async remove(id: string): Promise<void> {
    const { error } = await this.supabase.admin.from('goals').delete().eq('id', id);
    if (error) throw new BadRequestException(error.message);
  }
}
