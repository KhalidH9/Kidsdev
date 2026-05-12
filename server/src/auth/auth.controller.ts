import { Body, Controller, Get, HttpCode, HttpStatus, Post, UsePipes } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/roles.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { effectiveRole, type AuthContext } from '../common/types/auth-context';
import {
  forgotResetSchema,
  forgotVerifySchema,
  type ForgotResetInput,
  type ForgotVerifyInput,
  type SessionUserDto,
} from '@kids/shared';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('me')
  me(@CurrentUser() user: AuthContext): SessionUserDto & { role: string | null } {
    return {
      id: user.userId,
      email: user.email ?? '',
      role: effectiveRole(user),
      profile: user.profile
        ? {
            id: user.profile.id,
            schoolId: user.profile.schoolId,
            name: user.profile.name,
            email: user.profile.email,
            phone: user.profile.phone,
            role: user.profile.role,
            status: user.profile.status,
            createdAt: '',
            updatedAt: '',
          }
        : null,
    };
  }

  /** Step 1: verify email + phone, get back a reset token. */
  @Public()
  @Post('forgot-password/verify')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(forgotVerifySchema))
  verify(@Body() body: ForgotVerifyInput): Promise<{ token: string }> {
    return this.authService.verifyForgotPassword(body.email, body.phone);
  }

  /** Step 2: exchange the token + new password for a completed reset. */
  @Public()
  @Post('forgot-password/reset')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(forgotResetSchema))
  async reset(@Body() body: ForgotResetInput): Promise<{ ok: boolean }> {
    await this.authService.resetPassword(body.token, body.password);
    return { ok: true };
  }
}
