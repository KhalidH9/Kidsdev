import { Controller, ForbiddenException, Get, Query } from '@nestjs/common';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthContext } from '../common/types/auth-context';
import { AuditService } from './audit.service';

@Controller('audit')
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  @Roles('admin', 'specialist')
  async list(
    @CurrentUser() user: AuthContext,
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '10',
    @Query('entity') entity?: string,
  ) {
    if (!user.profile) throw new ForbiddenException();
    return this.audit.list(
      user.profile.schoolId,
      Math.max(1, Number(page) || 1),
      Math.min(100, Math.max(1, Number(pageSize) || 10)),
      entity,
    );
  }
}
