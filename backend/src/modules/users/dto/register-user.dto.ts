import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class RegisterUserDto {
  @ApiProperty({
    example: 'Ana Pérez',
    description: 'Nombre del usuario.',
  })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({
    example: 'ana@example.com',
    format: 'email',
    description: 'Correo electrónico del usuario.',
  })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({
    example: 'Password123',
    minLength: 8,
    description: 'Contraseña del usuario.',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password!: string;
}
