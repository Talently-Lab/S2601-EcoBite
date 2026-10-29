import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';

import {
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrdersService } from './orders.service';

@ApiTags('orders')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get('me/impact')
  @ApiOperation({
    summary: 'Get authenticated user impact indicators',
  })
  @ApiResponse({
    status: 200,
    description: 'User impact indicators retrieved successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication required',
  })
  getUserImpact(@CurrentUser() user: Express.User) {
    return this.ordersService.getUserImpact(user.userId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiSecurity('csrf-token')
  @ApiOperation({
    summary: 'Create an authenticated order',
  })
  @ApiBody({ type: CreateOrderDto })
  @ApiResponse({
    status: 201,
    description: 'Order created successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid order data or products',
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication required',
  })
  @ApiResponse({
    status: 403,
    description: 'Invalid CSRF token',
  })
  @ApiResponse({
    status: 404,
    description: 'Restaurant not found or inactive',
  })
  create(@CurrentUser() user: Express.User, @Body() dto: CreateOrderDto) {
    return this.ordersService.create(user.userId, dto);
  }
}
