import { Module } from '@nestjs/common';
import { ReinforcementsController } from './reinforcements.controller';
import { ReinforcementsService } from './reinforcements.service';

@Module({
  controllers: [ReinforcementsController],
  providers: [ReinforcementsService],
})
export class ReinforcementsModule {}
