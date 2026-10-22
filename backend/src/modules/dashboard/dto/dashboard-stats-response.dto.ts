// NOTE: Defines the administration dashboard statistics response.

import { ApiProperty } from '@nestjs/swagger';

export class DashboardStatsResponseDto {
  @ApiProperty({
    example: 150,
    description: 'Cantidad total de pedidos completados.',
  })
  completedOrders!: number;

  @ApiProperty({
    example: '245000.50',
    description:
      'Ingresos totales de pedidos completados, expresados como decimal.',
    type: String,
  })
  totalRevenue!: string;

  @ApiProperty({
    example: 12500,
    description:
      'CO₂ ahorrado en gramos por pedidos completados con entrega en bicicleta.',
  })
  co2SavedG!: number;
}
