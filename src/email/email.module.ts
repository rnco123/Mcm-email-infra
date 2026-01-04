import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmailService } from './email.service';
import { EmailController } from './email.controller';
import { EmailLog } from './entities/email-log.entity';
import { TenantModule } from '../tenant/tenant.module';
import { SqsModule } from '../sqs/sqs.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([EmailLog]),
    TenantModule,
    SqsModule,
  ],
  controllers: [EmailController],
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}

