"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateBasicRegionInfo20251001000003 = void 0;
class CreateBasicRegionInfo20251001000003 {
    constructor() {
        this.name = 'CreateBasicRegionInfo20251001000003';
    }
    async up(queryRunner) {
        await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS basic_region_info (
        code VARCHAR(12) PRIMARY KEY,
        name VARCHAR(50) NOT NULL,
        level INT NOT NULL,
        parent VARCHAR(12),
        sort INT DEFAULT 0
      )
    `);
        const tableName = 'basic_region_info';
        const [idxLevelExists] = await queryRunner.query(`SELECT COUNT(1) AS cnt FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = ? AND index_name = 'IDX_basic_region_info_level'`, [tableName]);
        if (!idxLevelExists?.cnt) {
            await queryRunner.query(`CREATE INDEX IDX_basic_region_info_level ON ${tableName} (level)`);
        }
        const [idxParentExists] = await queryRunner.query(`SELECT COUNT(1) AS cnt FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = ? AND index_name = 'IDX_basic_region_info_parent'`, [tableName]);
        if (!idxParentExists?.cnt) {
            await queryRunner.query(`CREATE INDEX IDX_basic_region_info_parent ON ${tableName} (parent)`);
        }
        const [idxSortExists] = await queryRunner.query(`SELECT COUNT(1) AS cnt FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = ? AND index_name = 'IDX_basic_region_info_sort'`, [tableName]);
        if (!idxSortExists?.cnt) {
            await queryRunner.query(`CREATE INDEX IDX_basic_region_info_sort ON ${tableName} (sort)`);
        }
    }
    async down(queryRunner) {
        await queryRunner.query(`DROP TABLE IF EXISTS basic_region_info`);
    }
}
exports.CreateBasicRegionInfo20251001000003 = CreateBasicRegionInfo20251001000003;
