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
  createGoalSchema,
  listQuerySchema,
  updateGoalSchema,
  type CreateGoalInput,
  type ListQuery,
  type UpdateGoalInput,
} from '@kids/shared';
import type { AuthContext } from '../common/types/auth-context';
import { SupabaseService } from '../supabase/supabase.service';
import { AuditService } from '../audit/audit.service';
import { GoalsService } from './goals.service';
import { assertChildAccess } from '../children/child-access.util';

@Controller('children/:childId/goals')
@Roles('admin', 'specialist', 'teacher')
export class GoalsController {
  constructor(
    private readonly goals: GoalsService,
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
    return this.goals.listByChild(childId, query);
  }

  @Post()
  @Roles('admin', 'specialist')
  async create(
    @CurrentUser() user: AuthContext,
    @Param('childId') childId: string,
    @Body(new ZodValidationPipe(createGoalSchema)) body: CreateGoalInput,
  ) {
    if (body.childId !== childId) throw new ForbiddenException('childId mismatch');
    await assertChildAccess(this.supabase, user, childId);
    if (!user.profile) throw new ForbiddenException();
    const created = await this.goals.create(body, user.profile.id);
    await this.audit.record({ actor: user, action: 'create', entity: 'goal', entityId: created.id });
    return created;
  }

  @Patch(':id')
  @Roles('admin', 'specialist')
  async update(
    @CurrentUser() user: AuthContext,
    @Param('childId') childId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateGoalSchema)) body: UpdateGoalInput,
  ) {
    await assertChildAccess(this.supabase, user, childId);
    const updated = await this.goals.update(id, body);
    await this.audit.record({ actor: user, action: 'update', entity: 'goal', entityId: id });
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
    await this.goals.remove(id);
    await this.audit.record({ actor: user, action: 'delete', entity: 'goal', entityId: id });
    return { ok: true };
  }
}
