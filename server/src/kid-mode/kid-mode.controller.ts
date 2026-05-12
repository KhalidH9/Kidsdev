import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Post,
} from '@nestjs/common';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { openKidModeSchema } from '@kids/shared';
import type { AuthContext } from '../common/types/auth-context';
import { SupabaseService } from '../supabase/supabase.service';
import { AuditService } from '../audit/audit.service';
import { KidModeService } from './kid-mode.service';
import { assertChildAccess } from '../children/child-access.util';

@Controller('kid-mode')
@Roles('admin', 'specialist', 'teacher')
export class KidModeController {
  constructor(
    private readonly svc: KidModeService,
    private readonly supabase: SupabaseService,
    private readonly audit: AuditService,
  ) {}

  @Get('child/:childId')
  async current(@CurrentUser() user: AuthContext, @Param('childId') childId: string) {
    await assertChildAccess(this.supabase, user, childId);
    return { session: await this.svc.findOpenForChild(childId) };
  }

  @Post('open')
  async open(
    @CurrentUser() user: AuthContext,
    @Body(new ZodValidationPipe(openKidModeSchema)) body: { childId: string },
  ) {
    await assertChildAccess(this.supabase, user, body.childId);
    if (!user.profile) throw new ForbiddenException();
    const session = await this.svc.open(body.childId, user.profile.id);
    await this.audit.record({
      actor: user, action: 'open', entity: 'kid_mode', entityId: session.id,
      metadata: { childId: body.childId },
    });
    return session;
  }

  @Post(':id/close')
  async close(@CurrentUser() user: AuthContext, @Param('id') id: string) {
    const session = await this.svc.close(id);
    await this.audit.record({
      actor: user, action: 'close', entity: 'kid_mode', entityId: id,
      metadata: { childId: session.childId },
    });
    return session;
  }
}
