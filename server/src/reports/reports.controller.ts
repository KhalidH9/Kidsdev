import { Controller, ForbiddenException, Get, Param, Res } from '@nestjs/common';
import type { Response } from 'express';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthContext } from '../common/types/auth-context';
import { SupabaseService } from '../supabase/supabase.service';
import { AuditService } from '../audit/audit.service';
import { ReportsService } from './reports.service';
import { assertChildAccess } from '../children/child-access.util';

@Controller('reports')
@Roles('admin', 'specialist')
export class ReportsController {
  constructor(
    private readonly svc: ReportsService,
    private readonly supabase: SupabaseService,
    private readonly audit: AuditService,
  ) {}

  @Get('child/:childId/pdf')
  async childPdf(
    @CurrentUser() user: AuthContext,
    @Param('childId') childId: string,
    @Res() res: Response,
  ) {
    const { schoolId } = await assertChildAccess(this.supabase, user, childId);
    if (!user.profile) throw new ForbiddenException();

    const buf = await this.svc.childReportPdf({ schoolId, childId });
    await this.audit.record({
      actor: user, action: 'export_pdf', entity: 'report', entityId: childId,
    });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="child-${childId}.pdf"`);
    res.send(buf);
  }
}
