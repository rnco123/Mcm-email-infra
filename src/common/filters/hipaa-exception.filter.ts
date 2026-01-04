import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
  Injectable,
} from '@nestjs/common';
import { FastifyReply, FastifyRequest } from 'fastify';
import { PhiMaskingService } from '../services/phi-masking.service';

/**
 * HIPAA-compliant exception filter
 * Ensures no PHI is exposed in error messages
 */
@Catch()
@Injectable()
export class HipaaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HipaaExceptionFilter.name);

  constructor(private readonly phiMaskingService: PhiMaskingService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<FastifyReply>();
    const request = ctx.getRequest<FastifyRequest>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    let message = 'An error occurred';
    if (exception instanceof HttpException) {
      const response = exception.getResponse();
      message = typeof response === 'string' 
        ? response 
        : (response as any)?.message || exception.message || 'An error occurred';
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    // Sanitize error message to remove any PHI
    const sanitizedMessage = this.phiMaskingService.sanitizeErrorMessage(message);

    // Log the error with masked PHI
    const errorDetails = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message: sanitizedMessage,
    };

    // Don't log the full exception in production to avoid PHI exposure
    if (status >= 500) {
      this.logger.error('Internal server error', errorDetails);
    } else {
      this.logger.warn('Client error', errorDetails);
    }

    // Return sanitized error response
    response.status(status).send({
      statusCode: status,
      message: sanitizedMessage,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}

