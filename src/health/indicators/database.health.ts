import { Injectable } from '@nestjs/common';
import {
  HealthIndicator,
  HealthIndicatorResult,
  HealthCheckError,
} from '@nestjs/terminus';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class DatabaseHealthIndicator extends HealthIndicator {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const startTime = Date.now();
    
    try {
      // Test database connection with a simple query
      await this.dataSource.query('SELECT 1');
      const responseTime = Date.now() - startTime;

      // Get database info
      const dbInfo = {
        database: this.dataSource.options.database || 'unknown',
        type: this.dataSource.options.type || 'unknown',
      };

      // Get database size and memory info
      let dbSize = 'unknown';
      let dbUsed = 'unknown';
      let dbTotal = 'unknown';
      
      try {
        // Get database size
        const sizeResult = await this.dataSource.query(`
          SELECT 
            pg_size_pretty(pg_database_size(current_database())) as size,
            pg_database_size(current_database()) as size_bytes
        `);
        
        if (sizeResult && sizeResult[0]) {
          dbSize = sizeResult[0].size;
          const sizeBytes = parseInt(sizeResult[0].size_bytes);
          
          // For Supabase, we can't get total allocated, but we can show used
          dbUsed = this.formatBytes(sizeBytes);
          
          // Try to get total allocated (Supabase specific - may not work on all instances)
          try {
            const totalResult = await this.dataSource.query(`
              SELECT setting::bigint * 1024 * 1024 as total_bytes
              FROM pg_settings 
              WHERE name = 'max_database_size'
            `);
            if (totalResult && totalResult[0] && totalResult[0].total_bytes) {
              dbTotal = this.formatBytes(parseInt(totalResult[0].total_bytes));
            } else {
              dbTotal = 'N/A (Supabase managed)';
            }
          } catch {
            dbTotal = 'N/A (Supabase managed)';
          }
        }
      } catch (error) {
        // If we can't get size info, continue with basic info
        dbSize = 'unknown';
        dbUsed = 'unknown';
        dbTotal = 'unknown';
      }

      return this.getStatus(key, true, {
        status: 'up',
        responseTime: `${responseTime}ms`,
        database: dbInfo.database,
        type: dbInfo.type,
        size: dbSize,
        used: dbUsed,
        total: dbTotal,
      });
    } catch (error) {
      const responseTime = Date.now() - startTime;
      throw new HealthCheckError(
        'Database check failed',
        this.getStatus(key, false, {
          status: 'down',
          responseTime: `${responseTime}ms`,
          error: error.message,
        }),
      );
    }
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }
}

