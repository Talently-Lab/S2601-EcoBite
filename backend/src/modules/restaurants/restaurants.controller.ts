import { Controller, Get, ParseIntPipe, Query } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';

import { Public } from '../auth/decorators/public.decorator';
import { RestaurantResponseDto } from './dto/restaurant-response.dto';
import { RestaurantsService } from './restaurants.service';

@ApiTags('restaurants')
@Controller('restaurants')
export class RestaurantsController {
  constructor(private readonly restaurantsService: RestaurantsService) {}

  @Get()
  @Public()
  @ApiOperation({
    summary: 'List restaurants',
  })
  @ApiQuery({
    name: 'comuna',
    required: false,
    type: Number,
    minimum: 1,
    maximum: 15,
    description: 'Filtrar restaurantes por comuna de CABA (1 a 15).',
  })
  @ApiOkResponse({
    description: 'List of registered restaurants.',
    type: RestaurantResponseDto,
    isArray: true,
  })
  findAll(
    @Query('comuna', new ParseIntPipe({ optional: true }))
    comuna?: number,
  ): Promise<RestaurantResponseDto[]> {
    return this.restaurantsService.findAll(comuna);
  }
}
