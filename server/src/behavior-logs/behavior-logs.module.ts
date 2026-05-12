import { Module } from '@nestjs/common';
import { BehaviorLogsController } from './behavior-logs.controller';
import { BehaviorLogsService } from './behavior-logs.service';

@Module({
  controllers: [BehaviorLogsController],
  providers: [BehaviorLogsService],
  exports: [BehaviorLogsService],
})
export class BehaviorLogsModule {}
