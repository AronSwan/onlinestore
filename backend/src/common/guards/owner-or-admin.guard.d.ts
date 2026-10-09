import { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
export declare const OWNERSHIP_PARAM_KEY = "ownershipParam";
export declare const OwnerParam: (param: string) => import("@nestjs/common").CustomDecorator<string>;
export declare class OwnerOrAdminGuard implements CanActivate {
    private readonly reflector;
    constructor(reflector: Reflector);
    canActivate(context: ExecutionContext): boolean;
}
