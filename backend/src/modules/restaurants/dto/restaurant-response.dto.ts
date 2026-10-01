import { ApiProperty } from '@nestjs/swagger';

export class RestaurantResponseDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    format: 'uuid',
    description: 'Identificador único del restaurante.',
  })
  id!: string;

  @ApiProperty({
    example: 'Eco Burger',
    description: 'Nombre del restaurante.',
  })
  name!: string;

  @ApiProperty({
    example: 'BIODEGRADABLE',
    description: 'Tipo de packaging utilizado por el restaurante.',
  })
  packagingType!: string;

  @ApiProperty({
    example: 'BIKE',
    description: 'Medio de entrega disponible.',
  })
  availableDeliveryMethod!: string;

  @ApiProperty({
    example: 'ACTIVE',
    description: 'Estado actual del restaurante.',
  })
  status!: string;

  @ApiProperty({
    example: 'High',
    description: 'Indicador de sostenibilidad del restaurante.',
  })
  sustainabilityIndicator!: string;
}
