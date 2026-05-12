import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';

import { SupabaseModule } from './supabase/supabase.module';
import { AuthModule } from './auth/auth.module';
import { AuthGuard } from './common/guards/auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { AuthMiddleware } from './common/middleware/auth.middleware';

import { UsersModule } from './users/users.module';
import { ParentsModule } from './parents/parents.module';
import { ChildrenModule } from './children/children.module';
import { AssignmentsModule } from './assignments/assignments.module';
import { GoalsModule } from './goals/goals.module';
import { ReinforcementsModule } from './reinforcements/reinforcements.module';
import { BehaviorLogsModule } from './behavior-logs/behavior-logs.module';
import { ParentTasksModule } from './parent-tasks/parent-tasks.module';
import { NotesModule } from './notes/notes.module';
import { KidModeModule } from './kid-mode/kid-mode.module';
import { AuditModule } from './audit/audit.module';
import { ReportsModule } from './reports/reports.module';
import { DashboardModule } from './dashboard/dashboard.module';

@Module({
  imports: [
    SupabaseModule,
    AuditModule,
    AuthModule,
    UsersModule,
    ParentsModule,
    ChildrenModule,
    AssignmentsModule,
    GoalsModule,
    ReinforcementsModule,
    BehaviorLogsModule,
    ParentTasksModule,
    NotesModule,
    KidModeModule,
    ReportsModule,
    DashboardModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(AuthMiddleware).forRoutes('*');
  }
}
