import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { rangeFor, paginate } from '../common/pagination/pagination.util';
import type {
  CreateUserInput,
  ListQuery,
  Paginated,
  UpdateUserInput,
  UserDto,
} from '@kids/shared';

type ProfileRow = {
  id: string;
  school_id: string;
  name: string;
  email: string;
  phone: string;
  role: 'admin' | 'specialist' | 'teacher';
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
};

function toDto(r: ProfileRow): UserDto {
  return {
    id: r.id,
    schoolId: r.school_id,
    name: r.name,
    email: r.email,
    phone: r.phone,
    role: r.role,
    status: r.status,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

@Injectable()
export class UsersService {
  constructor(private readonly supabase: SupabaseService) {}

  /**
   * Returns all active specialists and teachers in the school.
   * Intended for assignment dropdowns — no pagination, ordered by name.
   * Accessible by admin and specialist roles.
   */
  async listStaff(schoolId: string): Promise<{ data: UserDto[] }> {
    const { data, error } = await this.supabase.admin
      .from('profiles')
      .select('*')
      .eq('school_id', schoolId)
      .eq('status', 'active')
      .in('role', ['specialist', 'teacher'])
      .order('name', { ascending: true });
    if (error) throw new BadRequestException(error.message);
    return { data: (data ?? []).map(toDto) };
  }

  async list(schoolId: string, query: ListQuery): Promise<Paginated<UserDto>> {
    const { from, to } = rangeFor(query);
    let q = this.supabase.admin
      .from('profiles')
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

  async findById(schoolId: string, id: string): Promise<UserDto> {
    const { data, error } = await this.supabase.admin
      .from('profiles')
      .select('*')
      .eq('id', id)
      .eq('school_id', schoolId)
      .maybeSingle();
    if (error) throw new BadRequestException(error.message);
    if (!data) throw new NotFoundException('User not found');
    return toDto(data);
  }

  async create(schoolId: string, input: CreateUserInput): Promise<UserDto> {
    // Default password for all new staff accounts. Users must use Forgot Password
    // to set their own password on first sign-in.
    const password = '123456';
    const { data: authData, error: authErr } = await this.supabase.admin.auth.admin.createUser({
      email: input.email,
      password,
      email_confirm: true,
      user_metadata: { name: input.name, role: input.role },
    });
    if (authErr || !authData?.user) {
      throw new BadRequestException(authErr?.message ?? 'Failed to create auth user');
    }

    const { data, error } = await this.supabase.admin
      .from('profiles')
      .insert({
        id: authData.user.id,
        school_id: schoolId,
        name: input.name,
        email: input.email,
        phone: input.phone,
        role: input.role,
        status: input.status,
      })
      .select('*')
      .single();

    if (error) {
      // best-effort rollback of auth user
      await this.supabase.admin.auth.admin.deleteUser(authData.user.id).catch(() => undefined);
      if (error.code === '23505') throw new ConflictException('Email already in use');
      throw new BadRequestException(error.message);
    }
    return toDto(data);
  }

  async update(schoolId: string, id: string, input: UpdateUserInput): Promise<UserDto> {
    if (Object.keys(input).length === 0) {
      return this.findById(schoolId, id);
    }
    const patch: Record<string, unknown> = {};
    if (input.name !== undefined) patch.name = input.name;
    if (input.phone !== undefined) patch.phone = input.phone;
    if (input.role !== undefined) patch.role = input.role;
    if (input.status !== undefined) patch.status = input.status;

    const { data, error } = await this.supabase.admin
      .from('profiles')
      .update(patch)
      .eq('id', id)
      .eq('school_id', schoolId)
      .select('*')
      .single();
    if (error) throw new BadRequestException(error.message);
    if (!data) throw new NotFoundException('User not found');
    return toDto(data);
  }

  async setStatus(schoolId: string, id: string, status: 'active' | 'inactive'): Promise<UserDto> {
    return this.update(schoolId, id, { status });
  }
}
