import { Controller, Get, HttpStatus, HttpException, Req, Res } from '@nestjs/common';
import { FastifyRequest, FastifyReply } from 'fastify';
import {
  HealthCheckService,
  HealthCheckResult,
} from '@nestjs/terminus';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DatabaseHealthIndicator } from './indicators/database.health';
import { SqsHealthIndicator } from './indicators/sqs.health';
import { ResendHealthIndicator } from './indicators/resend.health';
import { MemoryHealthIndicator } from './indicators/memory.health';
import { AuditLog } from '../common/entities/audit-log.entity';

interface BeautifiedHealthResponse {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  currentTime: string;
  currentDate: string;
  lastApiUsage?: {
    endpoint: string;
    method: string;
    timestamp: string;
    timeAgo: string;
  };
  checks: {
    database: {
      status: 'up' | 'down';
      responseTime?: string;
      database?: string;
      type?: string;
      size?: string;
      used?: string;
      total?: string;
      error?: string;
    };
    sqs: {
      status: 'up' | 'down';
      responseTime?: string;
      emailQueue?: string;
      broadcastQueue?: string;
      error?: string;
    };
    resend: {
      status: 'up' | 'down';
      responseTime?: string;
      apiKeyConfigured?: boolean;
      apiKeyFormat?: string;
      error?: string;
    };
    memory: {
      status: 'up' | 'down';
      heapUsed?: string;
      heapTotal?: string;
      heapLimit?: string;
      error?: string;
    };
  };
  readiness: {
    status: 'ready' | 'not_ready';
    checks: string[];
  };
  liveness: {
    status: 'alive' | 'not_alive';
    checks: string[];
  };
}

@ApiTags('health')
@Controller('health')
export class HealthController {
  private readonly startTime = Date.now();

  constructor(
    private readonly health: HealthCheckService,
    private readonly database: DatabaseHealthIndicator,
    private readonly sqs: SqsHealthIndicator,
    private readonly resend: ResendHealthIndicator,
    private readonly memory: MemoryHealthIndicator,
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
  ) {}

  @Get()
  @ApiOperation({ 
    summary: 'Comprehensive health check',
    description: 'Returns detailed health status of all components. Returns HTML UI for browsers, JSON for API clients.'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Service health status with all component details',
  })
  @ApiResponse({ status: 503, description: 'Service is unhealthy' })
  async check(@Req() req: FastifyRequest, @Res() res: FastifyReply): Promise<void> {
    const now = new Date();
    const timestamp = now.toISOString();
    const currentTime = now.toLocaleTimeString();
    const currentDate = now.toLocaleDateString();
    const uptime = Math.floor((Date.now() - this.startTime) / 1000);

    // Get last API usage from audit logs
    let lastApiUsage = null;
    try {
      const lastLog = await this.auditLogRepository.findOne({
        where: {},
        order: { createdAt: 'DESC' },
      });
      
      if (lastLog) {
        const timeDiff = Math.floor((Date.now() - lastLog.createdAt.getTime()) / 1000);
        lastApiUsage = {
          endpoint: this.getEndpointFromUrl(lastLog.metadata?.url || 'unknown'),
          method: lastLog.metadata?.method || lastLog.action.toUpperCase(),
          timestamp: lastLog.createdAt.toISOString(),
          timeAgo: this.formatTimeAgo(timeDiff),
        };
      }
    } catch (error) {
      // If we can't get audit log, continue without it
    }

    // Run all health checks
    const [detailedResult, readinessResult, livenessResult] = await Promise.allSettled([
      // Detailed check: All components
      this.health.check([
        () => this.database.isHealthy('database'),
        () => this.sqs.isHealthy('sqs'),
        () => this.resend.isHealthy('resend'),
        () => this.memory.checkHeap('memory', 500 * 1024 * 1024), // 500MB threshold
      ]),
      // Readiness check: Critical dependencies
      this.health.check([
        () => this.database.isHealthy('database'),
        () => this.sqs.isHealthy('sqs'),
      ]),
      // Liveness check: Server is running
      this.health.check([
        () => this.memory.checkHeap('memory', 1000 * 1024 * 1024), // 1GB threshold
      ]),
    ]);

    // Extract component statuses
    const detailedStatus: HealthCheckResult | null = detailedResult.status === 'fulfilled' 
      ? detailedResult.value 
      : null;
    
    const readinessStatus: HealthCheckResult | null = readinessResult.status === 'fulfilled'
      ? readinessResult.value
      : null;
    
    const livenessStatus: HealthCheckResult | null = livenessResult.status === 'fulfilled'
      ? livenessResult.value
      : null;

    // Build beautified response
    const response: BeautifiedHealthResponse = {
      status: detailedStatus?.status === 'ok' ? 'healthy' : 'unhealthy',
      timestamp,
      currentTime,
      currentDate,
      uptime,
      version: '1.0.0',
      lastApiUsage: lastApiUsage || undefined,
      checks: {
        database: this.extractComponentStatus(detailedStatus, 'database'),
        sqs: this.extractComponentStatus(detailedStatus, 'sqs'),
        resend: this.extractComponentStatus(detailedStatus, 'resend'),
        memory: this.extractMemoryStatus(detailedStatus),
      },
      readiness: {
        status: readinessStatus?.status === 'ok' ? 'ready' : 'not_ready',
        checks: readinessStatus?.info ? Object.keys(readinessStatus.info) : [],
      },
      liveness: {
        status: livenessStatus?.status === 'ok' ? 'alive' : 'not_alive',
        checks: livenessStatus?.info ? Object.keys(livenessStatus.info) : [],
      },
    };

    // Check if request wants JSON (API client) or HTML (browser)
    const acceptHeader = req.headers.accept || '';
    const queryFormat = (req.query as any)?.format;
    const userAgent = req.headers['user-agent'] || '';
    
    const wantsJson = acceptHeader.includes('application/json') || 
                     queryFormat === 'json' ||
                     userAgent.includes('curl') ||
                     userAgent.includes('Postman') ||
                     userAgent.includes('httpie');

    const httpStatus = response.status === 'healthy' 
      ? HttpStatus.OK 
      : HttpStatus.SERVICE_UNAVAILABLE;

    if (wantsJson) {
      // Return JSON for API clients
      res.status(httpStatus).send(response);
      return;
    }

    // Return HTML UI for browsers
    const html = this.generateHealthDashboard(response);
    res.status(httpStatus).type('text/html').send(html);
  }

  private getEndpointFromUrl(url: string): string {
    if (!url) return 'unknown';
    // Extract endpoint from full URL
    const match = url.match(/\/api\/v1\/([^?]+)/);
    return match ? match[1] : url;
  }

  private formatTimeAgo(seconds: number): string {
    if (seconds < 60) return `${seconds} seconds ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    return `${Math.floor(seconds / 86400)} days ago`;
  }

  private generateHealthDashboard(data: BeautifiedHealthResponse): string {
    const statusColor = data.status === 'healthy' ? '#10b981' : '#ef4444';
    const statusIcon = data.status === 'healthy' ? '✅' : '❌';
    const uptimeFormatted = this.formatUptime(data.uptime);

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MCM EMAIL INFRA MULTI TENANT - Health Check</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 20px;
      color: #1f2937;
    }
    .container {
      max-width: 1400px;
      margin: 0 auto;
    }
    .header {
      background: white;
      border-radius: 12px;
      padding: 30px;
      margin-bottom: 20px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
    .title {
      font-size: 28px;
      font-weight: 700;
      color: #1f2937;
      margin-bottom: 20px;
      text-align: center;
      letter-spacing: 1px;
    }
    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      padding: 12px 24px;
      border-radius: 8px;
      font-size: 18px;
      font-weight: 600;
      background: ${statusColor}15;
      color: ${statusColor};
      border: 2px solid ${statusColor};
      margin-bottom: 20px;
    }
    .info-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 20px;
    }
    .info-table th,
    .info-table td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #e5e7eb;
    }
    .info-table th {
      background: #f9fafb;
      font-weight: 600;
      color: #374151;
      font-size: 12px;
      text-transform: uppercase;
    }
    .info-table td {
      color: #1f2937;
      font-size: 14px;
    }
    .info-table tr:hover {
      background: #f9fafb;
    }
    .components-table {
      width: 100%;
      border-collapse: collapse;
      background: white;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      margin-bottom: 20px;
    }
    .components-table th,
    .components-table td {
      padding: 16px;
      text-align: left;
      border-bottom: 1px solid #e5e7eb;
    }
    .components-table th {
      background: #667eea;
      color: white;
      font-weight: 600;
      font-size: 14px;
      text-transform: uppercase;
    }
    .components-table td {
      color: #1f2937;
      font-size: 14px;
    }
    .components-table tr:last-child td {
      border-bottom: none;
    }
    .components-table tr:hover {
      background: #f9fafb;
    }
    .status-badge-cell {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 12px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
    }
    .status-up {
      background: #10b98115;
      color: #10b981;
    }
    .status-down {
      background: #ef444415;
      color: #ef4444;
    }
    .status-indicator {
      width: 8px;
      height: 8px;
      border-radius: 50%;
    }
    .status-up .status-indicator {
      background: #10b981;
    }
    .status-down .status-indicator {
      background: #ef4444;
    }
    .footer {
      background: white;
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      text-align: center;
    }
    .refresh-btn {
      background: #667eea;
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s;
      margin-right: 10px;
    }
    .refresh-btn:hover {
      background: #5568d3;
    }
    .json-link {
      color: #667eea;
      text-decoration: none;
      font-size: 12px;
    }
    .json-link:hover {
      text-decoration: underline;
    }
    .countdown {
      color: #6b7280;
      font-size: 12px;
      margin-top: 10px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="title">MCM EMAIL INFRA MULTI TENANT</div>
      <div class="status-badge">
        <span>${statusIcon}</span>
        <span>System ${data.status.toUpperCase()}</span>
      </div>
      
      <table class="info-table">
        <thead>
          <tr>
            <th>Property</th>
            <th>Value</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Current Date</strong></td>
            <td>${data.currentDate}</td>
          </tr>
          <tr>
            <td><strong>Current Time</strong></td>
            <td>${data.currentTime}</td>
          </tr>
          <tr>
            <td><strong>Uptime</strong></td>
            <td>${uptimeFormatted}</td>
          </tr>
          <tr>
            <td><strong>Version</strong></td>
            <td>${data.version}</td>
          </tr>
          <tr>
            <td><strong>Last API Usage</strong></td>
            <td>${data.lastApiUsage ? `${data.lastApiUsage.method} ${data.lastApiUsage.endpoint} (${data.lastApiUsage.timeAgo})` : 'No API calls yet'}</td>
          </tr>
          <tr>
            <td><strong>Readiness</strong></td>
            <td><span class="status-badge-cell ${data.readiness.status === 'ready' ? 'status-up' : 'status-down'}">
              <span class="status-indicator"></span>
              ${data.readiness.status === 'ready' ? 'Ready' : 'Not Ready'}
            </span></td>
          </tr>
          <tr>
            <td><strong>Liveness</strong></td>
            <td><span class="status-badge-cell ${data.liveness.status === 'alive' ? 'status-up' : 'status-down'}">
              <span class="status-indicator"></span>
              ${data.liveness.status === 'alive' ? 'Alive' : 'Not Alive'}
            </span></td>
          </tr>
        </tbody>
      </table>
    </div>

    <table class="components-table">
      <thead>
        <tr>
          <th>Component</th>
          <th>Status</th>
          <th>Response Time</th>
          <th>Details</th>
        </tr>
      </thead>
      <tbody>
        ${this.renderTableRow('Database', data.checks.database)}
        ${this.renderTableRow('SQS', data.checks.sqs)}
        ${this.renderTableRow('Resend', data.checks.resend)}
        ${this.renderTableRow('Memory', data.checks.memory)}
      </tbody>
    </table>

    ${data.checks.database.size ? `
    <table class="components-table">
      <thead>
        <tr>
          <th colspan="4">Supabase Database Memory</th>
        </tr>
        <tr>
          <th>Property</th>
          <th>Value</th>
          <th>Property</th>
          <th>Value</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>Database Size</strong></td>
          <td>${data.checks.database.size || 'N/A'}</td>
          <td><strong>Used Memory</strong></td>
          <td>${data.checks.database.used || 'N/A'}</td>
        </tr>
        <tr>
          <td><strong>Total Memory</strong></td>
          <td>${data.checks.database.total || 'N/A (Supabase managed)'}</td>
          <td><strong>Database Name</strong></td>
          <td>${data.checks.database.database || 'N/A'}</td>
        </tr>
      </tbody>
    </table>
    ` : ''}

    <div class="footer">
      <button class="refresh-btn" onclick="location.reload()">🔄 Refresh Now</button>
      <a href="?format=json" class="json-link">View as JSON</a>
      <div class="countdown">Auto-refresh: <span id="countdown">30</span>s</div>
    </div>
  </div>

  <script>
    let countdown = 30;
    const countdownEl = document.getElementById('countdown');
    const interval = setInterval(() => {
      countdown--;
      countdownEl.textContent = countdown;
      if (countdown <= 0) {
        clearInterval(interval);
        location.reload();
      }
    }, 1000);
  </script>
</body>
</html>`;
  }

  private renderTableRow(name: string, component: any): string {
    const statusClass = component.status === 'up' ? 'status-up' : 'status-down';
    const statusText = component.status === 'up' ? 'Up' : 'Down';
    
    let details = '';
    const detailKeys = Object.keys(component).filter(key => 
      key !== 'status' && key !== 'error' && key !== 'responseTime'
    );
    
    detailKeys.forEach((key, index) => {
      if (component[key] !== undefined && component[key] !== null) {
        if (index > 0) details += ' | ';
        details += `${this.formatLabel(key)}: ${component[key]}`;
      }
    });

    if (component.error) {
      details += ` | Error: ${component.error}`;
    }

    if (!details) {
      details = '-';
    }

    return `
      <tr>
        <td><strong>${name}</strong></td>
        <td>
          <span class="status-badge-cell ${statusClass}">
            <span class="status-indicator"></span>
            ${statusText}
          </span>
        </td>
        <td>${component.responseTime || 'N/A'}</td>
        <td>${details}</td>
      </tr>`;
  }

  private formatLabel(key: string): string {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  }

  private formatUptime(seconds: number): string {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m ${secs}s`;
    if (minutes > 0) return `${minutes}m ${secs}s`;
    return `${secs}s`;
  }

  private extractComponentStatus(
    healthResult: HealthCheckResult | null,
    componentName: string,
  ): any {
    if (!healthResult?.info?.[componentName]) {
      return {
        status: 'down',
        error: 'Component check failed',
      };
    }

    const component = healthResult.info[componentName];
    return {
      ...component,
      status: component.status === 'up' ? 'up' : 'down',
    };
  }

  private extractMemoryStatus(
    healthResult: HealthCheckResult | null,
  ): any {
    if (!healthResult?.info?.memory) {
      return {
        status: 'down',
        error: 'Memory check failed',
      };
    }

    const memory = healthResult.info.memory;
    const heapUsed = memory.heapUsed || 0;
    const heapTotal = memory.heapTotal || 0;
    const heapLimit = memory.heapLimit || 0;

    return {
      status: memory.status === 'up' ? 'up' : 'down',
      heapUsed: this.formatBytes(heapUsed),
      heapTotal: this.formatBytes(heapTotal),
      heapLimit: this.formatBytes(heapLimit),
      ...(memory.error && { error: memory.error }),
    };
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }
}
