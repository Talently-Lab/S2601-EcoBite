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
import { RecentOrderResponseDto } from './dto/recent-order-response.dto';
import { ImpactRankingResponseDto } from './dto/impact-ranking-response.dto';

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

  @Get('recent-orders')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Obtener los últimos 5 pedidos',
  })
  @ApiOkResponse({
    description: 'Últimos 5 pedidos ordenados por fecha descendente.',
    type: RecentOrderResponseDto,
    isArray: true,
  })
  async getRecentOrders(): Promise<RecentOrderResponseDto[]> {
    return this.dashboardService.getRecentOrders();
  }

  @Get('impact-ranking')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Obtener ranking de restaurantes por impacto ambiental',
  })
  @ApiOkResponse({
    description:
      'Ranking de restaurantes con bicicleta, ordenados por CO₂ total ahorrado.',
    type: ImpactRankingResponseDto,
    isArray: true,
  })
  async getImpactRanking(): Promise<ImpactRankingResponseDto[]> {
    return this.dashboardService.getImpactRanking();
  }
}
