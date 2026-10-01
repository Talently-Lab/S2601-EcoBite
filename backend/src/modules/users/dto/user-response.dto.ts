import { ApiProperty } from '@nestjs/swagger';

export class UserResponseDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    format: 'uuid',
    description: 'Identificador único del usuario.',
  })
  id!: string;

  @ApiProperty({
    example: 'Ana Pérez',
    description: 'Nombre del usuario.',
  })
  name!: string;

  @ApiProperty({
    example: 'ana@example.com',
    format: 'email',
    description: 'Correo electrónico del usuario.',
  })
  email!: string;

  @ApiProperty({
    example: '2026-09-30T18:00:00.000Z',
    format: 'date-time',
    description: 'Fecha y hora de registro del usuario.',
  })
  registeredAt!: Date;
}
