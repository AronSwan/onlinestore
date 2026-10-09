import { NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { LogSanitizerService } from './log-sanitizer.service';
export declare class SecurityMiddleware implements NestMiddleware {
    private logSanitizer;
    constructor(logSanitizer: LogSanitizerService);
    use(req: Request, res: Response, next: NextFunction): void;
    private setSecurityHeaders;
    private validateRequestSize;
    private sanitizeRequestLog;
    private setCorsHeaders;
    private parseSize;
}
