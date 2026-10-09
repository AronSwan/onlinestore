import { CallHandler, ExecutionContext, NestInterceptor, ExceptionFilter, HttpException, ArgumentsHost, PipeTransform, ArgumentMetadata } from '@nestjs/common';
import { Observable } from 'rxjs';
export declare class VerifyEmailDto {
    email: string;
    options?: {
        timeout?: number;
        skipProxy?: boolean;
        requestId?: string;
    };
}
export declare class VerifyBatchEmailDto {
    emails: string[];
    options?: {
        batchSize?: number;
        batchDelay?: number;
        requestId?: string;
    };
}
export interface VerificationResult {
    email: string;
    valid: boolean;
    reason: string;
    code: string;
    duration_ms: number;
    timestamp: string;
    details?: any;
    fromCache?: boolean;
}
export interface BatchVerificationResult {
    total: number;
    success: number;
    errors: number;
    results: VerificationResult[];
    duration: number;
    timestamp: string;
}
export interface HealthCheckResult {
    status: string;
    timestamp: string;
    version: string;
    uptime: number;
    checks: any;
}
export interface ApiResponse<T> {
    success: boolean;
    data: T;
    timestamp: string;
}
export interface ErrorResponse {
    success: false;
    error: string;
    code?: string;
    timestamp: string;
    path?: string;
}
export declare const ENHANCED_EMAIL_VERIFIER_SERVICE_TOKEN = "EnhancedEmailVerifierService";
export declare const OPEN_OBSERVE_SERVICE_TOKEN = "OpenObserveService";
export declare class EmailVerificationService {
    private enhancedService;
    private openObserveService;
    constructor(enhancedService: any, openObserveService: any);
    verifyEmail(email: string, options?: any): Promise<VerificationResult>;
    verifyEmailBatch(emails: string[], options?: any): Promise<BatchVerificationResult>;
    getHealthStatus(): Promise<HealthCheckResult>;
    clearCache(): Promise<{
        message: string;
    }>;
    getConfig(): {
        rules: any;
        cache: {
            enabled: any;
            expiry: any;
        };
        timeout: any;
    };
    getMetrics(): any;
}
export declare class EmailVerificationInterceptor implements NestInterceptor {
    private openObserveService;
    constructor(openObserveService: any);
    intercept(context: ExecutionContext, next: CallHandler): Observable<any>;
}
export declare class EmailVerificationExceptionFilter implements ExceptionFilter {
    private logger;
    private openObserveService;
    constructor(openObserveService: any);
    catch(exception: HttpException, host: ArgumentsHost): void;
}
export declare class EmailValidationPipe implements PipeTransform {
    transform(value: any, metadata: ArgumentMetadata): any;
    private validateVerifyEmailDto;
    private validateVerifyBatchEmailDto;
}
export declare function EmailVerificationControllerDecorator(): (target: any) => void;
export declare class EmailVerificationController {
    private emailVerificationService;
    constructor(emailVerificationService: EmailVerificationService);
    verifyEmail(verifyEmailDto: VerifyEmailDto): Promise<ApiResponse<VerificationResult>>;
    verifyEmailBatch(verifyBatchEmailDto: VerifyBatchEmailDto): Promise<ApiResponse<BatchVerificationResult & {
        batchId: string;
    }>>;
    getHealth(): Promise<ApiResponse<HealthCheckResult>>;
    getMetrics(): Promise<ApiResponse<any>>;
    getConfig(): Promise<ApiResponse<any>>;
    clearCache(): Promise<ApiResponse<{
        message: string;
    }>>;
}
export declare class EmailVerificationModule {
}
