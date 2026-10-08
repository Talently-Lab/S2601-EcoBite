// NOTE: Handles public user registration requests.

import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';

import {
  ApiBadRequestResponse,
  ApiBody,
  ApiCreatedResponse,
  ApiOperation,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';

import { Public } from '../auth/decorators/public.decorator';
import { RegisterUserDto } from './dto/register-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { UserService } from '../auth/auth-user.service';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly userService: UserService) {}

  @Post('register')
  @Public()
  @ApiSecurity('csrf-token')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Register a new user',
  })
  @ApiBody({
    type: RegisterUserDto,
  })
  @ApiCreatedResponse({
    description: 'User successfully registered.',
    type: UserResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid or missing registration data.',
  })
  register(@Body() dto: RegisterUserDto): Promise<UserResponseDto> {
    return this.userService.create(dto);
  }
}
