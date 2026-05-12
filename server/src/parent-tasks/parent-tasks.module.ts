import { Module } from '@nestjs/common';
import { ParentTasksController } from './parent-tasks.controller';
import { ParentTasksService } from './parent-tasks.service';

@Module({
  controllers: [ParentTasksController],
  providers: [ParentTasksService],
})
export class ParentTasksModule {}
