import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { paginate, rangeFor } from '../common/pagination/pagination.util';
import { formatAge } from './age.util';
import type {
  AssignmentType,
  ChildAssigneeRef,
  ChildDto,
  CreateChildInput,
  ListQuery,
  Paginated,
  UpdateChildInput,
} from '@kids/shared';

type ChildRow = {
  id: string;
  school_id: string;
  name: string;
  date_of_birth: string;
  notes: string | null;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
};

type AssignmentRow = {
  child_id: string;
  assignee_id: string;
  type: AssignmentType;
};

@Injectable()
export class ChildrenService {
  constructor(private readonly supabase: SupabaseService) {}

  // -------------------------------------------------------------------------
  // Read
  // -------------------------------------------------------------------------
  async list(
    schoolId: string,
    query: ListQuery,
    opts: { teacherId?: string; parentId?: string } = {},
  ): Promise<Paginated<ChildDto>> {
    const { from, to } = rangeFor(query);

    // If scoping to teacher or parent, first collect child_ids assigned to them.
    let scopedIds: string[] | undefined;
    if (opts.teacherId || opts.parentId) {
      const assigneeId = opts.teacherId ?? opts.parentId!;
      const type: AssignmentType = opts.teacherId ? 'teacher' : 'parent';
      const { data, error } = await this.supabase.admin
        .from('child_assignments')
        .select('child_id')
        .eq('assignee_id', assigneeId)
        .eq('type', type);
      if (error) throw new BadRequestException(error.message);
      scopedIds = (data ?? []).map((r) => r.child_id);
      if (scopedIds.length === 0) return paginate([], 0, query);
    }

    let q = this.supabase.admin
      .from('children')
      .select('*', { count: 'exact' })
      .eq('school_id', schoolId)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (scopedIds) q = q.in('id', scopedIds);
    if (query.status) q = q.eq('status', query.status);
    if (query.search) q = q.ilike('name', `%${query.search}%`);

    const { data, error, count } = await q;
    if (error) throw new BadRequestException(error.message);

    const rows = (data ?? []) as ChildRow[];
    const assignments = await this.fetchAssignmentsMap(rows.map((r) => r.id));
    const dtos = rows.map((r) => this.rowToDto(r, assignments));
    return paginate(dtos, count ?? 0, query);
  }

  async findById(schoolId: string, id: string): Promise<ChildDto> {
    const { data, error } = await this.supabase.admin
      .from('children')
      .select('*')
      .eq('school_id', schoolId)
      .eq('id', id)
      .maybeSingle();
    if (error) throw new BadRequestException(error.message);
    if (!data) throw new NotFoundException('Child not found');
    const assignments = await this.fetchAssignmentsMap([id]);
    return this.rowToDto(data as ChildRow, assignments);
  }

  // -------------------------------------------------------------------------
  // Write
  // -------------------------------------------------------------------------
  async create(schoolId: string, input: CreateChildInput): Promise<ChildDto> {
    await this.validateAssignees(schoolId, input.specialistIds ?? [], input.teacherIds ?? [], input.parentIds ?? []);

    const { data, error } = await this.supabase.admin
      .from('children')
      .insert({
        school_id: schoolId,
        name: input.name,
        date_of_birth: input.dateOfBirth,
        notes: input.notes ?? null,
        status: input.status,
      })
      .select('*')
      .single();
    if (error) throw new BadRequestException(error.message);

    await this.replaceAssignments(data.id, {
      specialist: input.specialistIds ?? [],
      teacher: input.teacherIds ?? [],
      parent: input.parentIds ?? [],
    });

    return this.findById(schoolId, data.id);
  }

  async update(schoolId: string, id: string, input: UpdateChildInput): Promise<ChildDto> {
    await this.findById(schoolId, id); // ensures existence + school scope

    if (input.specialistIds || input.teacherIds || input.parentIds) {
      await this.validateAssignees(
        schoolId,
        input.specialistIds ?? [],
        input.teacherIds ?? [],
        input.parentIds ?? [],
      );
    }

    const patch: Record<string, unknown> = {};
    if (input.name !== undefined) patch.name = input.name;
    if (input.dateOfBirth !== undefined) patch.date_of_birth = input.dateOfBirth;
    if (input.notes !== undefined) patch.notes = input.notes;
    if (input.status !== undefined) patch.status = input.status;

    if (Object.keys(patch).length > 0) {
      const { error } = await this.supabase.admin
        .from('children')
        .update(patch)
        .eq('school_id', schoolId)
        .eq('id', id);
      if (error) throw new BadRequestException(error.message);
    }

    // For each provided assignment list, replace it. Skipping a field leaves
    // existing assignments untouched.
    const replace: Partial<Record<AssignmentType, string[]>> = {};
    if (input.specialistIds) replace.specialist = input.specialistIds;
    if (input.teacherIds) replace.teacher = input.teacherIds;
    if (input.parentIds) replace.parent = input.parentIds;
    if (Object.keys(replace).length > 0) {
      await this.replaceAssignments(id, replace);
    }

    return this.findById(schoolId, id);
  }

  async remove(schoolId: string, id: string): Promise<void> {
    const { error } = await this.supabase.admin
      .from('children')
      .delete()
      .eq('school_id', schoolId)
      .eq('id', id);
    if (error) throw new BadRequestException(error.message);
  }

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------
  private rowToDto(row: ChildRow, assignments: Map<string, ChildAssigneeRef[]>): ChildDto {
    const refs = assignments.get(row.id) ?? [];
    return {
      id: row.id,
      schoolId: row.school_id,
      name: row.name,
      dateOfBirth: row.date_of_birth,
      age: formatAge(row.date_of_birth),
      notes: row.notes,
      status: row.status,
      specialists: refs.filter((r) => r.role === 'specialist'),
      teachers: refs.filter((r) => r.role === 'teacher'),
      parents: refs.filter((r) => r.role === 'parent'),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /** Batch-fetch all assignments + names for the given child ids (no N+1). */
  private async fetchAssignmentsMap(childIds: string[]): Promise<Map<string, ChildAssigneeRef[]>> {
    const result = new Map<string, ChildAssigneeRef[]>();
    if (childIds.length === 0) return result;

    const { data: assignmentRows, error } = await this.supabase.admin
      .from('child_assignments')
      .select('child_id, assignee_id, type')
      .in('child_id', childIds);
    if (error) throw new BadRequestException(error.message);

    const rows = (assignmentRows ?? []) as AssignmentRow[];
    const staffIds = Array.from(
      new Set(rows.filter((r) => r.type !== 'parent').map((r) => r.assignee_id)),
    );
    const parentIds = Array.from(
      new Set(rows.filter((r) => r.type === 'parent').map((r) => r.assignee_id)),
    );

    const [staff, parents] = await Promise.all([
      staffIds.length > 0
        ? this.supabase.admin.from('profiles').select('id, name').in('id', staffIds)
        : Promise.resolve({ data: [], error: null }),
      parentIds.length > 0
        ? this.supabase.admin.from('parents').select('id, name').in('id', parentIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

    const nameById = new Map<string, string>();
    for (const r of (staff.data ?? []) as { id: string; name: string }[]) nameById.set(r.id, r.name);
    for (const r of (parents.data ?? []) as { id: string; name: string }[]) nameById.set(r.id, r.name);

    for (const r of rows) {
      const ref: ChildAssigneeRef = {
        id: r.assignee_id,
        name: nameById.get(r.assignee_id) ?? '(unknown)',
        role: r.type,
      };
      const list = result.get(r.child_id) ?? [];
      list.push(ref);
      result.set(r.child_id, list);
    }
    return result;
  }

  private async validateAssignees(
    schoolId: string,
    specialistIds: string[],
    teacherIds: string[],
    parentIds: string[],
  ): Promise<void> {
    if (specialistIds.length > 0 || teacherIds.length > 0) {
      const ids = [...specialistIds, ...teacherIds];
      const { data, error } = await this.supabase.admin
        .from('profiles')
        .select('id, role, status, school_id')
        .in('id', ids);
      if (error) throw new BadRequestException(error.message);
      const map = new Map<string, { role: string; status: string; schoolId: string }>(
        ((data ?? []) as { id: string; role: string; status: string; school_id: string }[]).map((r) => [
          r.id,
          { role: r.role, status: r.status, schoolId: r.school_id },
        ]),
      );
      for (const id of specialistIds) {
        const row = map.get(id);
        if (!row) throw new BadRequestException(`Specialist not found: ${id}`);
        if (row.schoolId !== schoolId) throw new BadRequestException('Specialist not in this school');
        if (row.role !== 'specialist') throw new BadRequestException(`User ${id} is not a specialist`);
        if (row.status !== 'active') throw new BadRequestException(`Specialist ${id} is inactive`);
      }
      for (const id of teacherIds) {
        const row = map.get(id);
        if (!row) throw new BadRequestException(`Teacher not found: ${id}`);
        if (row.schoolId !== schoolId) throw new BadRequestException('Teacher not in this school');
        if (row.role !== 'teacher') throw new BadRequestException(`User ${id} is not a teacher`);
        if (row.status !== 'active') throw new BadRequestException(`Teacher ${id} is inactive`);
      }
    }

    if (parentIds.length > 0) {
      const { data, error } = await this.supabase.admin
        .from('parents')
        .select('id, status, school_id')
        .in('id', parentIds);
      if (error) throw new BadRequestException(error.message);
      const map = new Map<string, { status: string; schoolId: string }>(
        ((data ?? []) as { id: string; status: string; school_id: string }[]).map((r) => [
          r.id,
          { status: r.status, schoolId: r.school_id },
        ]),
      );
      for (const id of parentIds) {
        const row = map.get(id);
        if (!row) throw new BadRequestException(`Parent not found: ${id}`);
        if (row.schoolId !== schoolId) throw new BadRequestException('Parent not in this school');
        if (row.status !== 'active') throw new BadRequestException(`Parent ${id} is inactive`);
      }
    }
  }

  private async replaceAssignments(
    childId: string,
    by: Partial<Record<AssignmentType, string[]>>,
  ): Promise<void> {
    for (const type of Object.keys(by) as AssignmentType[]) {
      const ids = by[type] ?? [];
      const { error: delErr } = await this.supabase.admin
        .from('child_assignments')
        .delete()
        .eq('child_id', childId)
        .eq('type', type);
      if (delErr) throw new BadRequestException(delErr.message);
      if (ids.length === 0) continue;
      const rows = Array.from(new Set(ids)).map((assignee_id) => ({
        child_id: childId,
        assignee_id,
        type,
      }));
      const { error: insErr } = await this.supabase.admin.from('child_assignments').insert(rows);
      if (insErr) throw new BadRequestException(insErr.message);
    }
  }
}
