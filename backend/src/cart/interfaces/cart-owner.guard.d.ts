import { CanActivate, ExecutionContext } from '@nestjs/common';
export declare class CartOwnerGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean;
}
