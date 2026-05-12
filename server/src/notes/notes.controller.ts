import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  createNoteSchema,
  listQuerySchema,
  updateNoteSchema,
  type CreateNoteInput,
  type ListQuery,
  type UpdateNoteInput,
} from '@kids/shared';
import { effectiveRole, type AuthContext } from '../common/types/auth-context';
import { SupabaseService } from '../supabase/supabase.service';
import { AuditService } from '../audit/audit.service';
import { NotesService } from './notes.service';
import { assertChildAccess } from '../children/child-access.util';

@Controller('children/:childId/notes')
@Roles('admin', 'specialist', 'teacher', 'parent')
export class NotesController {
  constructor(
    private readonly svc: NotesService,
    private readonly supabase: SupabaseService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  async list(
    @CurrentUser() user: AuthContext,
    @Param('childId') childId: string,
    @Query(new ZodValidationPipe(listQuerySchema)) query: ListQuery,
  ) {
    await assertChildAccess(this.supabase, user, childId);
    const parentVisibleOnly = effectiveRole(user) === 'parent';
    return this.svc.listByChild(childId, query, { parentVisibleOnly });
  }

  @Post()
  @Roles('admin', 'specialist')
  async create(
    @CurrentUser() user: AuthContext,
    @Param('childId') childId: string,
    @Body(new ZodValidationPipe(createNoteSchema)) body: CreateNoteInput,
  ) {
    if (body.childId !== childId) throw new ForbiddenException('childId mismatch');
    await assertChildAccess(this.supabase, user, childId);
    if (!user.profile) throw new ForbiddenException();
    const created = await this.svc.create(body, user.profile.id);
    await this.audit.record({ actor: user, action: 'create', entity: 'note', entityId: created.id });
    return created;
  }

  @Patch(':id')
  @Roles('admin', 'specialist')
  async update(
    @CurrentUser() user: AuthContext,
    @Param('childId') childId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateNoteSchema)) body: UpdateNoteInput,
  ) {
    await assertChildAccess(this.supabase, user, childId);
    const updated = await this.svc.update(id, body);
    await this.audit.record({ actor: user, action: 'update', entity: 'note', entityId: id });
    return updated;
  }

  @Delete(':id')
  @Roles('admin', 'specialist')
  async remove(
    @CurrentUser() user: AuthContext,
    @Param('childId') childId: string,
    @Param('id') id: string,
  ) {
    await assertChildAccess(this.supabase, user, childId);
    await this.svc.remove(id);
    await this.audit.record({ actor: user, action: 'delete', entity: 'note', entityId: id });
    return { ok: true };
  }
}
