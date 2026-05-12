import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { paginate, rangeFor } from '../common/pagination/pagination.util';
import type {
  CreateParentTaskInput,
  ListQuery,
  Paginated,
  ParentTaskDto,
  UpdateParentTaskInput,
} from '@kids/shared';

type Row = {
  id: string;
  child_id: string;
  parent_id: string;
  title: string;
  description: string | null;
  due_at: string | null;
  task_status: 'pending' | 'in_progress' | 'done' | 'cancelled';
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
};

const toDto = (r: Row): ParentTaskDto => ({
  id: r.id,
  childId: r.child_id,
  parentId: r.parent_id,
  title: r.title,
  description: r.description,
  dueAt: r.due_at,
  taskStatus: r.task_status,
  status: r.status,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

@Injectable()
export class ParentTasksService {
  constructor(private readonly supabase: SupabaseService) {}

  async listForChild(childId: string, query: ListQuery): Promise<Paginated<ParentTaskDto>> {
    const { from, to } = rangeFor(query);
    let q = this.supabase.admin
      .from('parent_tasks')
      .select('*', { count: 'exact' })
      .eq('child_id', childId)
      .order('created_at', { ascending: false })
      .range(from, to);
    if (query.status) q = q.eq('status', query.status);
    const { data, error, count } = await q;
    if (error) throw new BadRequestException(error.message);
    return paginate((data ?? []).map(toDto), count ?? 0, query);
  }

  async listForParent(parentId: string, query: ListQuery): Promise<Paginated<ParentTaskDto>> {
    const { from, to } = rangeFor(query);
    const { data, error, count } = await this.supabase.admin
      .from('parent_tasks')
      .select('*', { count: 'exact' })
      .eq('parent_id', parentId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .range(from, to);
    if (error) throw new BadRequestException(error.message);
    return paginate((data ?? []).map(toDto), count ?? 0, query);
  }

  async create(input: CreateParentTaskInput, createdBy: string): Promise<ParentTaskDto> {
    const { data, error } = await this.supabase.admin
      .from('parent_tasks')
      .insert({
        child_id: input.childId,
        parent_id: input.parentId,
        title: input.title,
        description: input.description ?? null,
        due_at: input.dueAt ?? null,
        task_status: input.taskStatus,
        status: input.status,
        created_by: createdBy,
      })
      .select('*')
      .single();
    if (error) throw new BadRequestException(error.message);
    return toDto(data);
  }

  async update(id: string, input: UpdateParentTaskInput): Promise<ParentTaskDto> {
    const patch: Record<string, unknown> = {};
    if (input.title !== undefined) patch.title = input.title;
    if (input.description !== undefined) patch.description = input.description;
    if (input.dueAt !== undefined) patch.due_at = input.dueAt;
    if (input.taskStatus !== undefined) patch.task_status = input.taskStatus;
    if (input.status !== undefined) patch.status = input.status;
    const { data, error } = await this.supabase.admin
      .from('parent_tasks').update(patch).eq('id', id).select('*').single();
    if (error) throw new BadRequestException(error.message);
    if (!data) throw new NotFoundException('Parent task not found');
    return toDto(data);
  }

  async remove(id: string): Promise<void> {
    const { error } = await this.supabase.admin.from('parent_tasks').delete().eq('id', id);
    if (error) throw new BadRequestException(error.message);
  }
}
