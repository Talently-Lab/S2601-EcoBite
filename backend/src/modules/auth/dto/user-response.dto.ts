// NOTE: Defines and documents safe authentication user response payloads.

import { ApiProperty } from '@nestjs/swagger';

export class AuthUserResponseDto {
  @ApiProperty({
    format: 'uuid',
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Identificador único del usuario.',
  })
  id!: string;

  @ApiProperty({
    example: 'Maria Garcia',
    description: 'Nombre del usuario.',
  })
  name!: string;

  @ApiProperty({
    format: 'email',
    example: 'maria@example.com',
    description: 'Correo electrónico del usuario.',
  })
  email!: string;

  @ApiProperty({
    type: String,
    format: 'date-time',
    example: '2026-09-30T18:00:00.000Z',
    description: 'Fecha y hora de registro del usuario.',
  })
  registeredAt!: Date;
}
