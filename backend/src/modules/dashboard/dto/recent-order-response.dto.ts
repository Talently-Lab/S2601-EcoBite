import { ApiProperty } from '@nestjs/swagger';
import { OrderStatus } from '@prisma/client';

export class RecentOrderResponseDto {
  @ApiProperty({
    example: '2026-10-27T14:30:00.000Z',
    description: 'Fecha y hora del pedido.',
    format: 'date-time',
  })
  orderedAt!: Date;

  @ApiProperty({
    example: 'Restaurante EcoBite',
    description: 'Nombre del restaurante.',
  })
  restaurant!: string;

  @ApiProperty({
    example: '3500.50',
    description: 'Importe total del pedido.',
    type: String,
  })
  totalAmount!: string;

  @ApiProperty({
    enum: OrderStatus,
    example: OrderStatus.COMPLETED,
    description: 'Estado del pedido.',
  })
  orderStatus!: OrderStatus;
}
