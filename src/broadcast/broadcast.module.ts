import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BroadcastService } from './broadcast.service';
import { BroadcastController } from './broadcast.controller';
import { Broadcast } from './entities/broadcast.entity';
import { BroadcastContact } from './entities/broadcast-contact.entity';
import { TenantModule } from '../tenant/tenant.module';
import { SqsModule } from '../sqs/sqs.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Broadcast, BroadcastContact]),
    TenantModule,
    forwardRef(() => SqsModule),
  ],
  controllers: [BroadcastController],
  providers: [BroadcastService],
  exports: [BroadcastService],
})
export class BroadcastModule {}

