import { Injectable } from '@nestjs/common';
import {
  HealthIndicator,
  HealthIndicatorResult,
  HealthCheckError,
} from '@nestjs/terminus';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class ResendHealthIndicator extends HealthIndicator {
  constructor(private readonly configService: ConfigService) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const startTime = Date.now();
    
    try {
      const apiKey = this.configService.get<string>('RESEND_API_KEY');
      
      if (!apiKey) {
        throw new HealthCheckError(
          'Resend API key not configured',
          this.getStatus(key, false, {
            status: 'down',
            apiKeyConfigured: false,
            error: 'RESEND_API_KEY environment variable is not set',
          }),
        );
      }

      // Create Resend client to verify API key format
      const resend = new Resend(apiKey);
      
      // Note: Resend doesn't have a simple "ping" endpoint
      // So we just verify the API key is configured and in correct format
      const isApiKeyValid = apiKey.startsWith('re_') && apiKey.length > 10;

      if (!isApiKeyValid) {
        throw new HealthCheckError(
          'Resend API key format invalid',
          this.getStatus(key, false, {
            status: 'down',
            apiKeyConfigured: true,
            apiKeyFormat: 'invalid',
            error: 'API key should start with "re_"',
          }),
        );
      }

      const responseTime = Date.now() - startTime;

      return this.getStatus(key, true, {
        status: 'up',
        responseTime: `${responseTime}ms`,
        apiKeyConfigured: true,
        apiKeyFormat: 'valid',
        note: 'API key validated (actual connectivity tested during email send)',
      });
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      if (error instanceof HealthCheckError) {
        throw error;
      }

      throw new HealthCheckError(
        'Resend check failed',
        this.getStatus(key, false, {
          status: 'down',
          responseTime: `${responseTime}ms`,
          error: error.message,
        }),
      );
    }
  }
}




