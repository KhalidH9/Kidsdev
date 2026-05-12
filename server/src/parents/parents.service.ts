import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { paginate, rangeFor } from '../common/pagination/pagination.util';
import type {
  CreateParentInput,
  ListQuery,
  Paginated,
  ParentDto,
  UpdateParentInput,
} from '@kids/shared';

type ParentRow = {
  id: string;
  school_id: string;
  name: string;
  email: string;
  phone: string;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
};

function toDto(r: ParentRow): ParentDto {
  return {
    id: r.id,
    schoolId: r.school_id,
    name: r.name,
    email: r.email,
    phone: r.phone,
    status: r.status,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

@Injectable()
export class ParentsService {
  constructor(private readonly supabase: SupabaseService) {}

  async list(schoolId: string, query: ListQuery): Promise<Paginated<ParentDto>> {
    const { from, to } = rangeFor(query);
    let q = this.supabase.admin
      .from('parents')
      .select('*', { count: 'exact' })
      .eq('school_id', schoolId)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (query.status) q = q.eq('status', query.status);
    if (query.search) q = q.or(`name.ilike.%${query.search}%,email.ilike.%${query.search}%`);

    const { data, error, count } = await q;
    if (error) throw new BadRequestException(error.message);
    return paginate((data ?? []).map(toDto), count ?? 0, query);
  }

  async findById(schoolId: string, id: string): Promise<ParentDto> {
    const { data, error } = await this.supabase.admin
      .from('parents')
      .select('*')
      .eq('school_id', schoolId)
      .eq('id', id)
      .maybeSingle();
    if (error) throw new BadRequestException(error.message);
    if (!data) throw new NotFoundException('Parent not found');
    return toDto(data);
  }

  async create(schoolId: string, input: CreateParentInput): Promise<ParentDto> {
    const { data, error } = await this.supabase.admin
      .from('parents')
      .insert({
        school_id: schoolId,
        name: input.name,
        email: input.email,
        phone: input.phone,
        status: input.status,
      })
      .select('*')
      .single();
    if (error) {
      if (error.code === '23505') throw new ConflictException('Parent email already exists for this school');
      throw new BadRequestException(error.message);
    }
    return toDto(data);
  }

  async update(schoolId: string, id: string, input: UpdateParentInput): Promise<ParentDto> {
    if (Object.keys(input).length === 0) return this.findById(schoolId, id);
    const { data, error } = await this.supabase.admin
      .from('parents')
      .update(input)
      .eq('school_id', schoolId)
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw new BadRequestException(error.message);
    if (!data) throw new NotFoundException('Parent not found');
    return toDto(data);
  }

  async remove(schoolId: string, id: string): Promise<void> {
    // Hard delete; cascades will clean child_assignments and parent_tasks.
    const { error } = await this.supabase.admin
      .from('parents')
      .delete()
      .eq('school_id', schoolId)
      .eq('id', id);
    if (error) throw new BadRequestException(error.message);
  }

  /**
   * Create a Supabase auth user for an existing parent and link it via
   * `parents.auth_user_id` so they can sign in to the parent portal.
   * Idempotent in spirit: re-inviting an already-linked parent fails.
   */
  async invite(
    schoolId: string,
    id: string,
    password?: string,
  ): Promise<{ parent: ParentDto; tempPassword: string }> {
    const existing = await this.findById(schoolId, id);

    const { data: row, error: rowErr } = await this.supabase.admin
      .from('parents')
      .select('auth_user_id')
      .eq('id', id)
      .maybeSingle();
    if (rowErr) throw new BadRequestException(rowErr.message);
    if (row?.auth_user_id) {
      throw new ConflictException('Parent already has an account');
    }

    const tempPassword = password ?? this.generatePassword();
    const { data: created, error: createErr } = await this.supabase.admin.auth.admin.createUser({
      email: existing.email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { name: existing.name, role: 'parent', school_id: schoolId },
    });
    if (createErr || !created?.user) {
      throw new BadRequestException(createErr?.message ?? 'Failed to create auth user');
    }

    const { data: linked, error: linkErr } = await this.supabase.admin
      .from('parents')
      .update({ auth_user_id: created.user.id })
      .eq('id', id)
      .eq('school_id', schoolId)
      .select('*')
      .single();
    if (linkErr) {
      await this.supabase.admin.auth.admin.deleteUser(created.user.id).catch(() => undefined);
      throw new BadRequestException(linkErr.message);
    }
    return { parent: toDto(linked), tempPassword };
  }

  private generatePassword(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
    let out = '';
    for (let i = 0; i < 14; i++) out += chars[Math.floor(Math.random() * chars.length)];
    return out + '!1';
  }
}
