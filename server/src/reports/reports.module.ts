import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { ChildrenModule } from '../children/children.module';
import { BehaviorLogsModule } from '../behavior-logs/behavior-logs.module';

@Module({
  imports: [ChildrenModule, BehaviorLogsModule],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
