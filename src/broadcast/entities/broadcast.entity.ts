import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { BroadcastContact } from './broadcast-contact.entity';

export enum BroadcastStatus {
  DRAFT = 'draft',
  QUEUED = 'queued',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

@Entity('broadcasts')
@Index(['tenantId', 'status'])
export class Broadcast {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tenantId: string;

  @Column({ nullable: true })
  domainId: string;

  @Column()
  name: string;

  @Column()
  subject: string;

  @Column('text', { nullable: true })
  html: string;

  @Column('text', { nullable: true })
  text: string;

  @Column({ nullable: true })
  from: string;

  @Column({
    type: 'enum',
    enum: BroadcastStatus,
    default: BroadcastStatus.DRAFT,
  })
  status: BroadcastStatus;

  @Column({ default: 0 })
  totalContacts: number;

  @Column({ default: 0 })
  sentCount: number;

  @Column({ default: 0 })
  failedCount: number;

  @Column('jsonb', { nullable: true })
  metadata: Record<string, any>;

  @OneToMany(() => BroadcastContact, (contact) => contact.broadcast)
  contacts: BroadcastContact[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

