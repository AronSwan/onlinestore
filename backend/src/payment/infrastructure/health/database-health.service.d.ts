export declare class DatabaseHealthService {
    check(): Promise<{
        status: string;
        details?: any;
    }>;
}
