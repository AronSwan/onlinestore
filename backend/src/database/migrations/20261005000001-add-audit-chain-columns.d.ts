import { MigrationInterface, QueryRunner } from 'typeorm';
export declare class AddAuditChainColumns20261005000001 implements MigrationInterface {
    up(queryRunner: QueryRunner): Promise<void>;
    down(queryRunner: QueryRunner): Promise<void>;
}
