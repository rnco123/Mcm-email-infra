import { Injectable } from '@nestjs/common';
import {
  HealthIndicator,
  HealthIndicatorResult,
  HealthCheckError,
} from '@nestjs/terminus';
import { MemoryHealthIndicator as TerminusMemoryHealthIndicator } from '@nestjs/terminus';

@Injectable()
export class MemoryHealthIndicator extends TerminusMemoryHealthIndicator {
  // This extends the built-in memory health indicator
  // We can add custom logic here if needed
}

