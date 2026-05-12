import { Controller, Get } from '@nestjs/common';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthContext } from '../common/types/auth-context';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
@Roles('admin', 'specialist', 'teacher')
export class DashboardController {
  constructor(private readonly svc: DashboardService) {}

  @Get('summary')
  summary(@CurrentUser() user: AuthContext) {
    return this.svc.summary(user);
  }
}
