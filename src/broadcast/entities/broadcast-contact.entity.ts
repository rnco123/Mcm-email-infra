import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Broadcast } from './broadcast.entity';

export enum ContactStatus {
  PENDING = 'pending',
  SENT = 'sent',
  FAILED = 'failed',
}

@Entity('broadcast_contacts')
@Index(['broadcastId', 'email'])
export class BroadcastContact {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  broadcastId: string;

  @Column()
  email: string;

  @Column('jsonb', { nullable: true })
  personalization: Record<string, any> | null;

  @Column({
    type: 'enum',
    enum: ContactStatus,
    default: ContactStatus.PENDING,
  })
  status: ContactStatus;

  @Column({ nullable: true })
  emailLogId: string;

  @Column('jsonb', { nullable: true })
  error: Record<string, any>;

  @ManyToOne(() => Broadcast, (broadcast) => broadcast.contacts)
  @JoinColumn({ name: 'broadcastId' })
  broadcast: Broadcast;

  @CreateDateColumn()
  createdAt: Date;
}

