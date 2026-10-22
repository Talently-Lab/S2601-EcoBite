// NOTE: Exposes administration dashboard statistics.

import { Controller, Get } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

import { Roles } from '../auth/decorators/roles.decorator';
import { DashboardService } from './dashboard.service';
import { DashboardStatsResponseDto } from './dto/dashboard-stats-response.dto';

@ApiTags('Dashboard')
@ApiBearerAuth()
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Obtener estadísticas del dashboard de administración',
  })
  @ApiOkResponse({
    description: 'Estadísticas generales de EcoBite.',
    type: DashboardStatsResponseDto,
  })
  async getStats(): Promise<DashboardStatsResponseDto> {
    return this.dashboardService.getStats();
  }
}
