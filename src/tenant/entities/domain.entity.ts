import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Tenant } from './tenant.entity';

@Entity('domains')
export class Domain {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  domain: string;

  @Column()
  resendApiKey: string;

  @Column({ default: true })
  isActive: boolean;

  @Column()
  tenantId: string;

  @ManyToOne(() => Tenant, (tenant) => tenant.domains)
  @JoinColumn({ name: 'tenantId' })
  tenant: Tenant;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

