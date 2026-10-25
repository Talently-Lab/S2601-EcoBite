import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateOrderItemDto {
  @ApiProperty({
    description: 'UUID of an existing product',
    format: 'uuid',
  })
  @IsUUID()
  productId!: string;

  @ApiProperty({
    description: 'Quantity of the product',
    example: 1,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  quantity!: number;
}

export class CreateOrderDto {
  @ApiProperty({
    description: 'UUID of the restaurant',
    format: 'uuid',
  })
  @IsUUID()
  restaurantId!: string;

  @ApiProperty({
    description: 'Delivery comuna (CABA, 1 to 15)',
    example: 14,
    minimum: 1,
    maximum: 15,
  })
  @IsInt()
  @Min(1)
  @Max(15)
  deliveryComuna!: number;

  @ApiProperty({
    description: 'Products included in the order',
    type: [CreateOrderItemDto],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items!: CreateOrderItemDto[];
}
