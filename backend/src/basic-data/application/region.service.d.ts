import { Repository } from 'typeorm';
import { RegionInfoEntity } from '../infrastructure/entities/region-info.entity';
export declare class RegionService {
    private readonly repo;
    constructor(repo: Repository<RegionInfoEntity>);
    listAll(): Promise<RegionInfoEntity[]>;
    listByLevel(level: number): Promise<RegionInfoEntity[]>;
    listByCode(code: string): Promise<RegionInfoEntity[]>;
    listByParent(parent: string): Promise<RegionInfoEntity[]>;
}
