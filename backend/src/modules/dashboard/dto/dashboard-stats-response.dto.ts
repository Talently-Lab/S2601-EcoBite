// NOTE: Defines the administration dashboard statistics response.

import { ApiProperty } from '@nestjs/swagger';

export class DashboardMetricsDto {
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

  @ApiProperty({
    example: 250.5,
    description:
      'Promedio de CO₂ ahorrado en gramos por pedido completado con entrega en bicicleta. Cero si no existen pedidos elegibles.',
  })
  avgCo2SavedG!: number;

  @ApiProperty({
    example: 1633.3366666666666,
    description:
      'Promedio del importe de pedidos COMPLETED, sin redondeo adicional. Cero si no existen pedidos completados.',
  })
  averageTicket!: number;

  @ApiProperty({
    example: 200,
    description:
      'Cantidad de usuarios con rol CLIENT. En los periodos se filtra por registeredAt.',
  })
  registeredUsers!: number;
}

export class DashboardPeriodDto extends DashboardMetricsDto {
  @ApiProperty({
    type: String,
    format: 'date-time',
    description: 'Inicio inclusivo del periodo (gte), expresado en UTC.',
  })
  startInclusive!: Date;

  @ApiProperty({
    type: String,
    format: 'date-time',
    description: 'Fin exclusivo del periodo (lt), expresado en UTC.',
  })
  endExclusive!: Date;
}

export class DashboardPercentageChangeDto {
  @ApiProperty({ type: Number, nullable: true })
  completedOrders!: number | null;

  @ApiProperty({ type: Number, nullable: true })
  totalRevenue!: number | null;

  @ApiProperty({ type: Number, nullable: true })
  averageTicket!: number | null;

  @ApiProperty({ type: Number, nullable: true })
  registeredUsers!: number | null;

  @ApiProperty({ type: Number, nullable: true })
  co2SavedG!: number | null;

  @ApiProperty({ type: Number, nullable: true })
  avgCo2SavedG!: number | null;
}

export class DashboardComparisonDto {
  @ApiProperty({
    example: 'America/Argentina/Buenos_Aires',
    description: 'Zona de calendario de ambos periodos.',
  })
  timeZone!: string;

  @ApiProperty({
    type: DashboardPeriodDto,
    description:
      'Ultimos 30 dias calendario, incluido el dia actual en Argentina. El dia actual aun puede estar en curso.',
  })
  current!: DashboardPeriodDto;

  @ApiProperty({
    type: DashboardPeriodDto,
    description:
      'Los 30 dias inmediatamente anteriores, sin solapamiento. Los pedidos se filtran por orderedAt y los clientes por registeredAt.',
  })
  previous!: DashboardPeriodDto;

  @ApiProperty({
    type: DashboardPercentageChangeDto,
    description:
      '(actual - anterior) / anterior * 100. Null si anterior = 0 y actual > 0; cero si ambos son cero. Sin redondeo adicional.',
  })
  percentageChange!: DashboardPercentageChangeDto;
}

export class DashboardStatsResponseDto extends DashboardMetricsDto {
  @ApiProperty({
    type: DashboardComparisonDto,
    description:
      'Comparacion 30/30. Los campos superiores siguen siendo acumulados, sin filtro temporal. No acepta parametros historicos.',
  })
  comparison!: DashboardComparisonDto;
}
