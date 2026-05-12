import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { paginate, rangeFor } from '../common/pagination/pagination.util';
import type {
  CreateNoteInput,
  ListQuery,
  NoteDto,
  Paginated,
  UpdateNoteInput,
} from '@kids/shared';

type Row = {
  id: string;
  child_id: string;
  title: string;
  body: string;
  visibility: 'staff' | 'parent';
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
};

const toDto = (r: Row): NoteDto => ({
  id: r.id,
  childId: r.child_id,
  title: r.title,
  body: r.body,
  visibility: r.visibility,
  status: r.status,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

@Injectable()
export class NotesService {
  constructor(private readonly supabase: SupabaseService) {}

  async listByChild(
    childId: string,
    query: ListQuery,
    opts: { parentVisibleOnly?: boolean } = {},
  ): Promise<Paginated<NoteDto>> {
    const { from, to } = rangeFor(query);
    let q = this.supabase.admin
      .from('notes')
      .select('*', { count: 'exact' })
      .eq('child_id', childId)
      .order('created_at', { ascending: false })
      .range(from, to);
    if (opts.parentVisibleOnly) q = q.eq('visibility', 'parent').eq('status', 'active');
    else if (query.status) q = q.eq('status', query.status);
    const { data, error, count } = await q;
    if (error) throw new BadRequestException(error.message);
    return paginate((data ?? []).map(toDto), count ?? 0, query);
  }

  async create(input: CreateNoteInput, createdBy: string): Promise<NoteDto> {
    const { data, error } = await this.supabase.admin
      .from('notes')
      .insert({
        child_id: input.childId,
        title: input.title,
        body: input.body,
        visibility: input.visibility,
        status: input.status,
        created_by: createdBy,
      })
      .select('*')
      .single();
    if (error) throw new BadRequestException(error.message);
    return toDto(data);
  }

  async update(id: string, input: UpdateNoteInput): Promise<NoteDto> {
    const patch: Record<string, unknown> = {};
    if (input.title !== undefined) patch.title = input.title;
    if (input.body !== undefined) patch.body = input.body;
    if (input.visibility !== undefined) patch.visibility = input.visibility;
    if (input.status !== undefined) patch.status = input.status;
    const { data, error } = await this.supabase.admin
      .from('notes').update(patch).eq('id', id).select('*').single();
    if (error) throw new BadRequestException(error.message);
    if (!data) throw new NotFoundException('Note not found');
    return toDto(data);
  }

  async remove(id: string): Promise<void> {
    const { error } = await this.supabase.admin.from('notes').delete().eq('id', id);
    if (error) throw new BadRequestException(error.message);
  }
}
