import { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
export declare const RateLimit: (options: {
    ttl: number;
    limit: number;
}) => (target: any, propertyKey: string, descriptor: PropertyDescriptor) => void;
export declare class RateLimitGuard implements CanActivate {
    private reflector;
    private readonly requestCounts;
    constructor(reflector: Reflector);
    canActivate(context: ExecutionContext): boolean;
    private generateKey;
    private getClientIP;
    private cleanExpiredCounters;
}
export declare const PaymentRateLimit: () => (target: any, propertyKey: string, descriptor: PropertyDescriptor) => void;
export declare const CallbackRateLimit: () => (target: any, propertyKey: string, descriptor: PropertyDescriptor) => void;
export declare const QueryRateLimit: () => (target: any, propertyKey: string, descriptor: PropertyDescriptor) => void;
