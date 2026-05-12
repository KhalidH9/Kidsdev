import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  createBehaviorLogSchema,
  listQuerySchema,
  type CreateBehaviorLogInput,
  type ListQuery,
} from '@kids/shared';
import { effectiveRole, type AuthContext } from '../common/types/auth-context';
import { SupabaseService } from '../supabase/supabase.service';
import { AuditService } from '../audit/audit.service';
import { BehaviorLogsService } from './behavior-logs.service';
import { assertChildAccess } from '../children/child-access.util';

@Controller('children/:childId/behavior-logs')
@Roles('admin', 'specialist', 'teacher')
export class BehaviorLogsController {
  constructor(
    private readonly svc: BehaviorLogsService,
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
    return this.svc.listByChild(childId, query);
  }

  @Post()
  @Roles('teacher')
  async create(
    @CurrentUser() user: AuthContext,
    @Param('childId') childId: string,
    @Body(new ZodValidationPipe(createBehaviorLogSchema)) body: CreateBehaviorLogInput,
  ) {
    if (body.childId !== childId) throw new ForbiddenException('childId mismatch');
    await assertChildAccess(this.supabase, user, childId);
    if (effectiveRole(user) !== 'teacher' || !user.profile) throw new ForbiddenException();
    const created = await this.svc.create(user.profile.id, body);
    await this.audit.record({ actor: user, action: 'create', entity: 'behavior_log', entityId: created.id });
    return created;
  }
}
