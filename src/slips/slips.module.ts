import { AuthModule } from '../auth/auth.module.js';
import { Module } from '@nestjs/common';
import { SlipsService } from './slips.service.js';
import { SlipsController } from './slips.controller.js';

@Module({
  imports: [AuthModule],
  providers: [SlipsService],
  controllers: [SlipsController],
  exports: [SlipsService],
})
export class SlipsModule {}
