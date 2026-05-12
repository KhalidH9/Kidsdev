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
  createParentTaskSchema,
  listQuerySchema,
  updateParentTaskSchema,
  type CreateParentTaskInput,
  type ListQuery,
  type UpdateParentTaskInput,
} from '@kids/shared';
import { effectiveRole, type AuthContext } from '../common/types/auth-context';
import { SupabaseService } from '../supabase/supabase.service';
import { AuditService } from '../audit/audit.service';
import { ParentTasksService } from './parent-tasks.service';
import { assertChildAccess } from '../children/child-access.util';

@Controller('parent-tasks')
@Roles('admin', 'specialist', 'parent')
export class ParentTasksController {
  constructor(
    private readonly svc: ParentTasksService,
    private readonly supabase: SupabaseService,
    private readonly audit: AuditService,
  ) {}

  /** Specialist: list tasks for a specific child. */
  @Get('child/:childId')
  @Roles('admin', 'specialist')
  async listChild(
    @CurrentUser() user: AuthContext,
    @Param('childId') childId: string,
    @Query(new ZodValidationPipe(listQuerySchema)) query: ListQuery,
  ) {
    await assertChildAccess(this.supabase, user, childId);
    return this.svc.listForChild(childId, query);
  }

  /** Parent: list tasks assigned to me. */
  @Get('mine')
  @Roles('parent')
  async listMine(
    @CurrentUser() user: AuthContext,
    @Query(new ZodValidationPipe(listQuerySchema)) query: ListQuery,
  ) {
    if (!user.parent) throw new ForbiddenException();
    return this.svc.listForParent(user.parent.id, query);
  }

  @Post()
  @Roles('admin', 'specialist')
  async create(
    @CurrentUser() user: AuthContext,
    @Body(new ZodValidationPipe(createParentTaskSchema)) body: CreateParentTaskInput,
  ) {
    await assertChildAccess(this.supabase, user, body.childId);
    if (!user.profile) throw new ForbiddenException();
    const created = await this.svc.create(body, user.profile.id);
    await this.audit.record({ actor: user, action: 'create', entity: 'parent_task', entityId: created.id });
    return created;
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: AuthContext,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateParentTaskSchema)) body: UpdateParentTaskInput,
  ) {
    // Parents may only update taskStatus on their own tasks.
    if (effectiveRole(user) === 'parent') {
      const allowed: UpdateParentTaskInput = { taskStatus: body.taskStatus };
      const updated = await this.svc.update(id, allowed);
      await this.audit.record({ actor: user, action: 'update', entity: 'parent_task', entityId: id });
      return updated;
    }
    const updated = await this.svc.update(id, body);
    await this.audit.record({ actor: user, action: 'update', entity: 'parent_task', entityId: id });
    return updated;
  }

  @Delete(':id')
  @Roles('admin', 'specialist')
  async remove(@CurrentUser() user: AuthContext, @Param('id') id: string) {
    await this.svc.remove(id);
    await this.audit.record({ actor: user, action: 'delete', entity: 'parent_task', entityId: id });
    return { ok: true };
  }
}
