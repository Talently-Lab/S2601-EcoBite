import { ApiProperty } from '@nestjs/swagger';

export class UserImpactResponseDto {
  @ApiProperty({
    description:
      "Total CO2 saved in grams by the user's BIKE orders, regardless of status.",
    example: 489,
  })
  totalCo2SavedG!: number;

  @ApiProperty({
    description:
      "Number of the user's orders with positive CO2 savings, regardless of status or delivery method.",
    example: 3,
  })
  ordersWithImpact!: number;

  @ApiProperty({
    description:
      'Average CO2 saved in grams per COMPLETED BIKE order of the user, without rounding; zero when none exist.',
    example: 100 / 3,
  })
  avgCo2SavedG!: number;

  @ApiProperty({
    description:
      "Number of the user's COMPLETED BIKE orders, including orders with zero CO2 savings; denominator of avgCo2SavedG.",
    example: 3,
  })
  sustainableOrdersCount!: number;
}
