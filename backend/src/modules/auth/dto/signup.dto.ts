// NOTE: Defines and documents the public signup request payload.

import { ApiProperty } from '@nestjs/swagger';

import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class SignupDto {
  @ApiProperty({ example: 'Maria Garcia' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({
    format: 'email',
    example: 'maria@example.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({
    minLength: 8,
    example: 'Password123',
  })
  @IsString()
  @MinLength(8)
  @IsNotEmpty()
  password!: string;
}
