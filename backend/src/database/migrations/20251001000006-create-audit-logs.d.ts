import { MigrationInterface, QueryRunner } from 'typeorm';
export declare class CreateAuditLogs20251001000006 implements MigrationInterface {
    up(queryRunner: QueryRunner): Promise<void>;
    down(queryRunner: QueryRunner): Promise<void>;
}
