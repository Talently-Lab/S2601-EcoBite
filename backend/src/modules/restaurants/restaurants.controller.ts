import { Controller, Get } from '@nestjs/common';

import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

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
  @ApiOkResponse({
    description: 'List of registered restaurants.',
    type: RestaurantResponseDto,
    isArray: true,
  })
  findAll(): Promise<RestaurantResponseDto[]> {
    return this.restaurantsService.findAll();
  }
}
