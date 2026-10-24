import { ApiProperty } from '@nestjs/swagger';

export class RestaurantDishResponseDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    format: 'uuid',
    description: 'Identificador único del plato.',
  })
  id!: string;

  @ApiProperty({
    example: 'Milanesa con papas',
    description: 'Nombre del plato.',
  })
  name!: string;

  @ApiProperty({
    example: '12500.00',
    description: 'Precio del plato en ARS.',
  })
  price!: string;
}

export class RestaurantResponseDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    format: 'uuid',
    description: 'Identificador único del restaurante.',
  })
  id!: string;

  @ApiProperty({
    example: 'REST-001',
    description: 'Identificador del restaurante proveniente del dataset.',
  })
  idRestaurant!: string;

  @ApiProperty({
    example: 'Eco Burger',
    description: 'Nombre del restaurante.',
  })
  name!: string;

  @ApiProperty({
    example: 3,
    nullable: true,
    minimum: 1,
    maximum: 15,
    description: 'Comuna de CABA donde se ubica el restaurante (1 a 15).',
  })
  comuna!: number | null;

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

  @ApiProperty({
    type: () => RestaurantDishResponseDto,
    isArray: true,
    description: 'Platos disponibles del restaurante.',
  })
  products!: RestaurantDishResponseDto[];
}
