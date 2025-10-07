import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ApiGetResource } from '../../common/decorators/api-docs.decorator';
import { RegionService } from '../application/region.service';
import { RegionInfoEntity } from '../infrastructure/entities/region-info.entity';

@ApiTags('行政区划')
@Controller('api/basics-data/region')
export class RegionController {
  constructor(private readonly service: RegionService) {}

  @ApiGetResource(Object, 'API接口')
  @Get('all')
  listAll(): Promise<RegionInfoEntity[]> {
    return this.service.listAll();
  }

  @ApiGetResource(Object, 'API接口')
  @Get('list/level/:level')
  listByLevel(@Param('level') level: string): Promise<RegionInfoEntity[]> {
    return this.service.listByLevel(Number(level));
  }

  @ApiGetResource(Object, 'API接口')
  @Get('list/code/:code')
  listByCode(@Param('code') code: string): Promise<RegionInfoEntity[]> {
    return this.service.listByCode(code);
  }

  @ApiGetResource(Object, 'API接口')
  @Get('list/parent/:parent')
  listByParent(@Param('parent') parent: string): Promise<RegionInfoEntity[]> {
    return this.service.listByParent(parent);
  }
}
