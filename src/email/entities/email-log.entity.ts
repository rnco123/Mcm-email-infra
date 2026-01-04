import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum EmailStatus {
  PENDING = 'pending',
  QUEUED = 'queued',
  SENT = 'sent',
  DELIVERED = 'delivered',
  BOUNCED = 'bounced',
  COMPLAINED = 'complained',
  FAILED = 'failed',
}

@Entity('email_logs')
@Index(['tenantId', 'idempotencyKey'], { unique: true })
@Index(['tenantId', 'status'])
@Index(['resendEmailId'])
export class EmailLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tenantId: string;

  @Column({ nullable: true })
  domainId: string;

  @Column({ unique: true, nullable: true })
  idempotencyKey: string;

  @Column()
  to: string;

  @Column({ nullable: true })
  from: string;

  @Column()
  subject: string;

  @Column('text', { nullable: true })
  html: string;

  @Column('text', { nullable: true })
  text: string;

  @Column('varchar', { nullable: true })
  resendEmailId: string | null;

  @Column({
    type: 'enum',
    enum: EmailStatus,
    default: EmailStatus.PENDING,
  })
  status: EmailStatus;

  @Column('jsonb', { nullable: true })
  metadata: Record<string, any>;

  @Column('jsonb', { nullable: true })
  error: Record<string, any>;

  @Column({ default: 0 })
  retryCount: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

