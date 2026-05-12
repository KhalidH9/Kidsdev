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
import {
  createParentSchema,
  inviteParentSchema,
  listQuerySchema,
  updateParentSchema,
  type CreateParentInput,
  type InviteParentInput,
  type ListQuery,
  type UpdateParentInput,
} from '@kids/shared';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import type { AuthContext } from '../common/types/auth-context';
import { AuditService } from '../audit/audit.service';
import { ParentsService } from './parents.service';

@Controller('parents')
@Roles('admin', 'specialist')
export class ParentsController {
  constructor(
    private readonly parents: ParentsService,
    private readonly audit: AuditService,
  ) {}

  private schoolOf(user: AuthContext): string {
    if (!user.profile) throw new ForbiddenException();
    return user.profile.schoolId;
  }

  @Get()
  list(
    @CurrentUser() user: AuthContext,
    @Query(new ZodValidationPipe(listQuerySchema)) query: ListQuery,
  ) {
    return this.parents.list(this.schoolOf(user), query);
  }

  @Get(':id')
  get(@CurrentUser() user: AuthContext, @Param('id') id: string) {
    return this.parents.findById(this.schoolOf(user), id);
  }

  @Post()
  async create(
    @CurrentUser() user: AuthContext,
    @Body(new ZodValidationPipe(createParentSchema)) body: CreateParentInput,
  ) {
    const created = await this.parents.create(this.schoolOf(user), body);
    await this.audit.record({ actor: user, action: 'create', entity: 'parent', entityId: created.id });
    return created;
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: AuthContext,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateParentSchema)) body: UpdateParentInput,
  ) {
    const updated = await this.parents.update(this.schoolOf(user), id, body);
    await this.audit.record({
      actor: user,
      action: 'update',
      entity: 'parent',
      entityId: id,
      metadata: body as Record<string, unknown>,
    });
    return updated;
  }

  @Delete(':id')
  async remove(@CurrentUser() user: AuthContext, @Param('id') id: string) {
    await this.parents.remove(this.schoolOf(user), id);
    await this.audit.record({ actor: user, action: 'delete', entity: 'parent', entityId: id });
    return { ok: true };
  }

  @Post(':id/invite')
  async invite(
    @CurrentUser() user: AuthContext,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(inviteParentSchema)) body: InviteParentInput,
  ) {
    const result = await this.parents.invite(this.schoolOf(user), id, body.password);
    await this.audit.record({
      actor: user,
      action: 'invite',
      entity: 'parent',
      entityId: id,
    });
    return result;
  }
}
