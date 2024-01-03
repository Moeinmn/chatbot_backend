import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';

@Module({
  controllers: [HealthController, TerminusModule]
})
export class HealthModule {}
