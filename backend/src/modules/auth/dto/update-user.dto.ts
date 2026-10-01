// NOTE: Defines and documents partial user update request payloads.

import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export interface UpdateUserBody {
  name?: string;
  email?: string;
  password?: string;
}

export class UpdateUserDto implements UpdateUserBody {
  @ApiPropertyOptional({
    example: 'Maria Garcia',
    description: 'Nuevo nombre del usuario.',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @ApiPropertyOptional({
    format: 'email',
    example: 'maria@example.com',
    description: 'Nuevo correo electrónico del usuario.',
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({
    minLength: 8,
    description: 'Nueva contraseña, con un mínimo de 8 caracteres.',
    example: 'NewPass456',
  })
  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;
}
