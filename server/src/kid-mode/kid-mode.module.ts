import { Module } from '@nestjs/common';
import { KidModeController } from './kid-mode.controller';
import { KidModeService } from './kid-mode.service';

@Module({
  controllers: [KidModeController],
  providers: [KidModeService],
})
export class KidModeModule {}
