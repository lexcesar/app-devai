import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { DatabaseService } from '../../database/database.service';

@ApiTags('health')
@Controller()
export class HealthController {
  constructor(private readonly db: DatabaseService) {}

  @Get('health')
  async health() {
    const start = Date.now();
    let dbOk = false;
    try {
      await this.db.query('SELECT 1');
      dbOk = true;
    } catch {
      dbOk = false;
    }
    return {
      status: dbOk ? 'ok' : 'degraded',
      db: dbOk ? 'ok' : 'down',
      uptime_s: Math.floor(process.uptime()),
      response_ms: Date.now() - start,
      version: process.env.npm_package_version ?? 'dev',
      env: process.env.NODE_ENV ?? 'development',
      timestamp: new Date().toISOString(),
    };
  }
}
