import { Module } from '@nestjs/common';
import { SqsService } from './sqs.service';
import { EmailProcessor } from './processors/email.processor';
import { BroadcastProcessor } from './processors/broadcast.processor';
import { EmailModule } from '../email/email.module';
import { BroadcastModule } from '../broadcast/broadcast.module';

@Module({
  imports: [EmailModule, BroadcastModule],
  providers: [SqsService, EmailProcessor, BroadcastProcessor],
  exports: [SqsService],
})
export class SqsModule {}

