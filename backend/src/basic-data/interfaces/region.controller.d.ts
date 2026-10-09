import { RegionService } from '../application/region.service';
import { RegionInfoEntity } from '../infrastructure/entities/region-info.entity';
export declare class RegionController {
    private readonly service;
    constructor(service: RegionService);
    listAll(): Promise<RegionInfoEntity[]>;
    listByLevel(level: string): Promise<RegionInfoEntity[]>;
    listByCode(code: string): Promise<RegionInfoEntity[]>;
    listByParent(parent: string): Promise<RegionInfoEntity[]>;
}
