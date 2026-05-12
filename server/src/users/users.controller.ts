import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  createUserSchema,
  listQuerySchema,
  updateUserSchema,
  type CreateUserInput,
  type ListQuery,
  type UpdateUserInput,
} from '@kids/shared';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import type { AuthContext } from '../common/types/auth-context';
import { AuditService } from '../audit/audit.service';
import { UsersService } from './users.service';

@Controller('users')
@Roles('admin')
export class UsersController {
  constructor(
    private readonly users: UsersService,
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
    return this.users.list(this.schoolOf(user), query);
  }

  /**
   * Returns all active specialists + teachers for assignment dropdowns.
   * Accessible by admin and specialist roles (overrides class-level admin guard).
   * Must be declared before /:id so NestJS doesn't treat "staff" as a UUID param.
   */
  @Get('staff')
  @Roles('admin', 'specialist')
  listStaff(@CurrentUser() user: AuthContext) {
    return this.users.listStaff(this.schoolOf(user));
  }

  @Get(':id')
  get(@CurrentUser() user: AuthContext, @Param('id') id: string) {
    return this.users.findById(this.schoolOf(user), id);
  }

  @Post()
  async create(
    @CurrentUser() user: AuthContext,
    @Body(new ZodValidationPipe(createUserSchema)) body: CreateUserInput,
  ) {
    const created = await this.users.create(this.schoolOf(user), body);
    await this.audit.record({ actor: user, action: 'create', entity: 'user', entityId: created.id });
    return created;
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: AuthContext,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateUserSchema)) body: UpdateUserInput,
  ) {
    const updated = await this.users.update(this.schoolOf(user), id, body);
    await this.audit.record({
      actor: user,
      action: 'update',
      entity: 'user',
      entityId: id,
      metadata: body as Record<string, unknown>,
    });
    return updated;
  }

  @Patch(':id/status')
  async setStatus(
    @CurrentUser() user: AuthContext,
    @Param('id') id: string,
    @Body() body: { status: 'active' | 'inactive' },
  ) {
    const updated = await this.users.setStatus(this.schoolOf(user), id, body.status);
    await this.audit.record({
      actor: user,
      action: body.status === 'active' ? 'activate' : 'deactivate',
      entity: 'user',
      entityId: id,
    });
    return updated;
  }
}
