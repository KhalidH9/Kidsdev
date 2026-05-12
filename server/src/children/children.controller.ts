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
  createChildSchema,
  listQuerySchema,
  updateChildSchema,
  type CreateChildInput,
  type ListQuery,
  type UpdateChildInput,
} from '@kids/shared';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import type { AuthContext } from '../common/types/auth-context';
import { effectiveRole } from '../common/types/auth-context';
import { AuditService } from '../audit/audit.service';
import { ChildrenService } from './children.service';

@Controller('children')
@Roles('admin', 'specialist', 'teacher', 'parent')
export class ChildrenController {
  constructor(
    private readonly children: ChildrenService,
    private readonly audit: AuditService,
  ) {}

  private schoolOf(user: AuthContext): string {
    const id = user.profile?.schoolId ?? user.parent?.schoolId;
    if (!id) throw new ForbiddenException();
    return id;
  }

  @Get()
  list(
    @CurrentUser() user: AuthContext,
    @Query(new ZodValidationPipe(listQuerySchema)) query: ListQuery,
  ) {
    const role = effectiveRole(user);
    const opts: { teacherId?: string; parentId?: string } = {};
    if (role === 'teacher' && user.profile) opts.teacherId = user.profile.id;
    if (role === 'parent' && user.parent) opts.parentId = user.parent.id;
    return this.children.list(this.schoolOf(user), query, opts);
  }

  @Get(':id')
  async get(@CurrentUser() user: AuthContext, @Param('id') id: string) {
    const child = await this.children.findById(this.schoolOf(user), id);
    const role = effectiveRole(user);
    if (role === 'teacher' && user.profile) {
      if (!child.teachers.some((t) => t.id === user.profile!.id)) {
        throw new ForbiddenException('Not assigned to this child');
      }
    }
    if (role === 'parent' && user.parent) {
      if (!child.parents.some((p) => p.id === user.parent!.id)) {
        throw new ForbiddenException('Not linked to this child');
      }
    }
    return child;
  }

  @Post()
  @Roles('admin', 'specialist')
  async create(
    @CurrentUser() user: AuthContext,
    @Body(new ZodValidationPipe(createChildSchema)) body: CreateChildInput,
  ) {
    const created = await this.children.create(this.schoolOf(user), body);
    await this.audit.record({ actor: user, action: 'create', entity: 'child', entityId: created.id });
    return created;
  }

  @Patch(':id')
  @Roles('admin', 'specialist')
  async update(
    @CurrentUser() user: AuthContext,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateChildSchema)) body: UpdateChildInput,
  ) {
    const updated = await this.children.update(this.schoolOf(user), id, body);
    await this.audit.record({
      actor: user,
      action: 'update',
      entity: 'child',
      entityId: id,
      metadata: body as Record<string, unknown>,
    });
    return updated;
  }

  @Delete(':id')
  @Roles('admin', 'specialist')
  async remove(@CurrentUser() user: AuthContext, @Param('id') id: string) {
    await this.children.remove(this.schoolOf(user), id);
    await this.audit.record({ actor: user, action: 'delete', entity: 'child', entityId: id });
    return { ok: true };
  }
}
