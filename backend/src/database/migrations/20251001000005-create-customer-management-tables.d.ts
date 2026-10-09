import { MigrationInterface, QueryRunner } from 'typeorm';
export declare class CreateCustomerManagementTables20251001000005 implements MigrationInterface {
    name: string;
    up(queryRunner: QueryRunner): Promise<void>;
    down(queryRunner: QueryRunner): Promise<void>;
}
