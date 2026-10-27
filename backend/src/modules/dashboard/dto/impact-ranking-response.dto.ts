import { ApiProperty } from '@nestjs/swagger';

export class ImpactRankingResponseDto {
  @ApiProperty({
    example: 'Restaurante EcoBite',
    description: 'Nombre del restaurante.',
  })
  restaurant!: string;

  @ApiProperty({
    example: 12500,
    description: 'CO₂ total ahorrado en gramos.',
  })
  co2SavedG!: number;
}
