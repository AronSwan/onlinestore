export declare class AuditLogEntity {
    id: string;
    userId: string;
    userName: string;
    operation: string;
    module: string;
    method: string;
    url: string;
    ip: string;
    userAgent: string;
    requestParams: string;
    responseData: string;
    duration: number;
    status: string;
    errorMessage: string;
    seq: number;
    prevHash: string;
    recordHash: string;
    createTime: Date;
}
