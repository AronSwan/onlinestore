import { DataSource } from 'typeorm';
export declare const ANONYMIZED_USERNAME = "[\u5DF2\u6CE8\u9500]";
export declare class UserDeletionService {
    private readonly dataSource;
    private readonly logger;
    constructor(dataSource: DataSource);
    deleteMeCascade(userId: number): Promise<void>;
    private anonymizeAuditTrail;
}
