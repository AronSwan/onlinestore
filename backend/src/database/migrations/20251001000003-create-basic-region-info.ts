import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateBasicRegionInfo20251001000003 implements MigrationInterface {
  name = 'CreateBasicRegionInfo20251001000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
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
    const [idxLevelExists] = await queryRunner.query(
      `SELECT COUNT(1) AS cnt FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = ? AND index_name = 'IDX_basic_region_info_level'`,
      [tableName],
    );
    if (!idxLevelExists?.cnt) {
      await queryRunner.query(
        `CREATE INDEX IDX_basic_region_info_level ON ${tableName} (level)`,
      );
    }
    const [idxParentExists] = await queryRunner.query(
      `SELECT COUNT(1) AS cnt FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = ? AND index_name = 'IDX_basic_region_info_parent'`,
      [tableName],
    );
    if (!idxParentExists?.cnt) {
      await queryRunner.query(
        `CREATE INDEX IDX_basic_region_info_parent ON ${tableName} (parent)`,
      );
    }
    const [idxSortExists] = await queryRunner.query(
      `SELECT COUNT(1) AS cnt FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = ? AND index_name = 'IDX_basic_region_info_sort'`,
      [tableName],
    );
    if (!idxSortExists?.cnt) {
      await queryRunner.query(
        `CREATE INDEX IDX_basic_region_info_sort ON ${tableName} (sort)`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS basic_region_info`);
  }
}
