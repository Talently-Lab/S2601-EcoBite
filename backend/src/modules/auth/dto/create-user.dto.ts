// NOTE: Defines and documents user creation request payloads.

import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({
    example: 'Maria Garcia',
    description: 'Nombre del usuario.',
  })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({
    format: 'email',
    example: 'maria@example.com',
    description: 'Correo electrónico del usuario.',
  })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({
    minLength: 8,
    example: 'Password123',
    description: 'Contraseña del usuario.',
  })
  @IsString()
  @MinLength(8)
  @IsNotEmpty()
  password!: string;
}
