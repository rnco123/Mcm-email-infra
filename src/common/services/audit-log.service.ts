import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog, AuditAction, AuditResource } from '../entities/audit-log.entity';
import { PhiMaskingService } from './phi-masking.service';

/**
 * HIPAA-compliant audit logging service
 * Logs all access to PHI for compliance
 */
@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
    private readonly phiMaskingService: PhiMaskingService,
  ) {}

  /**
   * Logs an audit event
   */
  async log(
    tenantId: string,
    action: AuditAction,
    resourceType: AuditResource,
    options: {
      resourceId?: string;
      userId?: string;
      description?: string;
      metadata?: Record<string, any>;
      ipAddress?: string;
      userAgent?: string;
      success?: boolean;
      error?: Error | string;
    } = {},
  ): Promise<void> {
    try {
      const {
        resourceId,
        userId,
        description,
        metadata = {},
        ipAddress,
        userAgent,
        success = true,
        error,
      } = options;

      // Sanitize error message to remove PHI
      const errorMessage = error
        ? this.phiMaskingService.sanitizeErrorMessage(error)
        : null;

      // Mask PHI in metadata
      const sanitizedMetadata = this.phiMaskingService.maskPhiObject(metadata);

      const auditLog = this.auditLogRepository.create({
        tenantId,
        userId,
        action,
        resourceType,
        resourceId,
        description,
        metadata: sanitizedMetadata,
        ipAddress,
        userAgent,
        success,
        errorMessage,
      });

      await this.auditLogRepository.save(auditLog);
    } catch (error) {
      // Don't throw - audit logging should never break the application
      this.logger.error('Failed to create audit log', error);
    }
  }

  /**
   * Logs PHI access
   */
  async logPhiAccess(
    tenantId: string,
    resourceType: AuditResource,
    resourceId: string,
    request: {
      userId?: string;
      ipAddress?: string;
      userAgent?: string;
    },
  ): Promise<void> {
    await this.log(tenantId, AuditAction.ACCESS, resourceType, {
      resourceId,
      ...request,
      description: `Accessed ${resourceType} with PHI`,
    });
  }

  /**
   * Logs PHI creation
   */
  async logPhiCreation(
    tenantId: string,
    resourceType: AuditResource,
    resourceId: string,
    request: {
      userId?: string;
      ipAddress?: string;
      userAgent?: string;
      metadata?: Record<string, any>;
    },
  ): Promise<void> {
    await this.log(tenantId, AuditAction.CREATE, resourceType, {
      resourceId,
      ...request,
      description: `Created ${resourceType} containing PHI`,
    });
  }

  /**
   * Logs PHI update
   */
  async logPhiUpdate(
    tenantId: string,
    resourceType: AuditResource,
    resourceId: string,
    request: {
      userId?: string;
      ipAddress?: string;
      userAgent?: string;
      metadata?: Record<string, any>;
    },
  ): Promise<void> {
    await this.log(tenantId, AuditAction.UPDATE, resourceType, {
      resourceId,
      ...request,
      description: `Updated ${resourceType} containing PHI`,
    });
  }
}

