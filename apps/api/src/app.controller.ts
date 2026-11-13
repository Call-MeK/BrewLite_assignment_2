import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  // Lightweight liveness probe used by deployment smoke tests; no database access.
  @Get('health')
  health() {
    return { status: 'ok', service: 'brewlite-api' };
  }
}
