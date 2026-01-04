import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditLogService } from '../services/audit-log.service';
import { AuditAction, AuditResource } from '../entities/audit-log.entity';

/**
 * Interceptor to automatically log API access for HIPAA compliance
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly auditLogService: AuditLogService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const { method, url, ip, headers } = request;
    const tenantId = request.tenantId;
    const userId = headers['x-api-key']?.substring(0, 8) || 'unknown';

    // Map HTTP methods to audit actions
    const actionMap: Record<string, AuditAction> = {
      GET: AuditAction.READ,
      POST: AuditAction.CREATE,
      PUT: AuditAction.UPDATE,
      PATCH: AuditAction.UPDATE,
      DELETE: AuditAction.DELETE,
    };

    const action = actionMap[method] || AuditAction.ACCESS;

    // Determine resource type from URL
    let resourceType: AuditResource | null = null;
    if (url.includes('/broadcast')) {
      resourceType = url.includes('/contacts') 
        ? AuditResource.BROADCAST_CONTACT 
        : AuditResource.BROADCAST;
    } else if (url.includes('/email')) {
      resourceType = AuditResource.EMAIL_LOG;
    } else if (url.includes('/tenant')) {
      resourceType = AuditResource.TENANT;
    } else if (url.includes('/domain')) {
      resourceType = AuditResource.DOMAIN;
    }

    // Extract resource ID from URL if available
    const resourceIdMatch = url.match(/\/([a-f0-9-]{36})/);
    const resourceId = resourceIdMatch ? resourceIdMatch[1] : undefined;

    return next.handle().pipe(
      tap({
        next: () => {
          // Log successful access
          if (tenantId && resourceType) {
            this.auditLogService.log(tenantId, action, resourceType, {
              resourceId,
              userId,
              ipAddress: ip,
              userAgent: headers['user-agent'],
              success: true,
              description: `${method} ${url}`,
            });
          }
        },
        error: (error) => {
          // Log failed access
          if (tenantId && resourceType) {
            this.auditLogService.log(tenantId, action, resourceType, {
              resourceId,
              userId,
              ipAddress: ip,
              userAgent: headers['user-agent'],
              success: false,
              error: error.message,
              description: `${method} ${url} - Failed`,
            });
          }
        },
      }),
    );
  }
}

