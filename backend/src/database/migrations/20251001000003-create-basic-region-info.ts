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
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS IDX_basic_region_info_level ON basic_region_info (level)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS IDX_basic_region_info_parent ON basic_region_info (parent)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS IDX_basic_region_info_sort ON basic_region_info (sort)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS basic_region_info`);
  }
}
