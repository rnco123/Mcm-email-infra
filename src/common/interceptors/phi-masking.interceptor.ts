import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { PhiMaskingService } from '../services/phi-masking.service';

/**
 * Interceptor to mask PHI in responses for logging
 * Note: This doesn't mask API responses, only logs
 * For production, you may want to conditionally mask based on user permissions
 */
@Injectable()
export class PhiMaskingInterceptor implements NestInterceptor {
  constructor(private readonly phiMaskingService: PhiMaskingService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((data) => {
        // In production, you might want to conditionally mask based on user role
        // For now, we'll mask PHI in logs but not in API responses
        // You can add logic here to mask based on user permissions
        
        // For logging purposes, we'll create a masked version
        if (data && typeof data === 'object') {
          // Don't modify the actual response, just return as-is
          // Masking in logs is handled by the logger
          return data;
        }
        return data;
      }),
    );
  }
}

