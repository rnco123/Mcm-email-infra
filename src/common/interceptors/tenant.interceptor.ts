import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  UnauthorizedException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { TenantService } from '../../tenant/tenant.service';

@Injectable()
export class TenantInterceptor implements NestInterceptor {
  constructor(private readonly tenantService: TenantService) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-api-key'] || request.headers['authorization']?.replace('Bearer ', '');

    if (!apiKey) {
      throw new UnauthorizedException('API key is required');
    }

    const tenant = await this.tenantService.findByApiKey(apiKey);
    if (!tenant) {
      throw new UnauthorizedException('Invalid API key');
    }

    request.tenantId = tenant.id;
    return next.handle();
  }
}

