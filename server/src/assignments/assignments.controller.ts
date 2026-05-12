import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Param,
  Post,
} from '@nestjs/common';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { ChildrenService } from '../children/children.service';
import { AuditService } from '../audit/audit.service';
import { assignmentSchema, type AssignmentInput } from '@kids/shared';
import type { AuthContext } from '../common/types/auth-context';

@Controller('assignments')
@Roles('admin', 'specialist')
export class AssignmentsController {
  constructor(
    private readonly children: ChildrenService,
    private readonly audit: AuditService,
  ) {}

  private schoolOf(user: AuthContext): string {
    if (!user.profile) throw new ForbiddenException();
    return user.profile.schoolId;
  }

  @Post()
  async add(
    @CurrentUser() user: AuthContext,
    @Body(new ZodValidationPipe(assignmentSchema)) body: AssignmentInput,
  ) {
    const child = await this.children.findById(this.schoolOf(user), body.childId);
    const ids = {
      specialist: child.specialists.map((r) => r.id),
      teacher: child.teachers.map((r) => r.id),
      parent: child.parents.map((r) => r.id),
    };
    if (!ids[body.type].includes(body.assigneeId)) ids[body.type].push(body.assigneeId);
    const updated = await this.children.update(this.schoolOf(user), body.childId, {
      specialistIds: ids.specialist,
      teacherIds: ids.teacher,
      parentIds: ids.parent,
    });
    await this.audit.record({
      actor: user,
      action: 'assign',
      entity: 'child',
      entityId: body.childId,
      metadata: { type: body.type, assigneeId: body.assigneeId },
    });
    return updated;
  }

  @Delete(':childId/:type/:assigneeId')
  async remove(
    @CurrentUser() user: AuthContext,
    @Param('childId') childId: string,
    @Param('type') type: 'specialist' | 'teacher' | 'parent',
    @Param('assigneeId') assigneeId: string,
  ) {
    const child = await this.children.findById(this.schoolOf(user), childId);
    const ids = {
      specialist: child.specialists.map((r) => r.id),
      teacher: child.teachers.map((r) => r.id),
      parent: child.parents.map((r) => r.id),
    };
    ids[type] = ids[type].filter((x) => x !== assigneeId);
    const updated = await this.children.update(this.schoolOf(user), childId, {
      specialistIds: ids.specialist,
      teacherIds: ids.teacher,
      parentIds: ids.parent,
    });
    await this.audit.record({
      actor: user,
      action: 'unassign',
      entity: 'child',
      entityId: childId,
      metadata: { type, assigneeId },
    });
    return updated;
  }
}
