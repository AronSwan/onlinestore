export declare class ApiResponseDto<T = any> {
    success: boolean;
    data?: T;
    message?: string;
}
export declare class ErrorResponseDto {
    success: boolean;
    statusCode: number;
    message: string;
    timestamp: string;
}
export declare class PaginatedResponseDto<T = any> {
    items: T[];
    total: number;
    page: number;
    limit: number;
}
