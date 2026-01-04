import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum AuditAction {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  ACCESS = 'access',
  EXPORT = 'export',
  LOGIN = 'login',
  LOGOUT = 'logout',
}

export enum AuditResource {
  BROADCAST = 'broadcast',
  BROADCAST_CONTACT = 'broadcast_contact',
  EMAIL_LOG = 'email_log',
  TENANT = 'tenant',
  DOMAIN = 'domain',
}

@Entity('audit_logs')
@Index(['tenantId', 'createdAt'])
@Index(['resourceType', 'resourceId'])
@Index(['action', 'createdAt'])
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tenantId: string;

  @Column({ nullable: true })
  userId: string; // API key identifier or user ID

  @Column({
    type: 'enum',
    enum: AuditAction,
  })
  action: AuditAction;

  @Column({
    type: 'enum',
    enum: AuditResource,
  })
  resourceType: AuditResource;

  @Column({ nullable: true })
  resourceId: string;

  @Column('text', { nullable: true })
  description: string;

  @Column('jsonb', { nullable: true })
  metadata: Record<string, any>;

  @Column({ nullable: true })
  ipAddress: string;

  @Column({ nullable: true })
  userAgent: string;

  @Column({ default: true })
  success: boolean;

  @Column('text', { nullable: true })
  errorMessage: string; // Sanitized, no PHI

  @CreateDateColumn()
  createdAt: Date;
}

