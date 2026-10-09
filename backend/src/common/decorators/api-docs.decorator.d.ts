import { Type } from '@nestjs/common';
export interface ApiDocsOptions {
    summary: string;
    description?: string;
    auth?: boolean;
    responses?: {
        success?: {
            type?: Type<any>;
            description?: string;
            isArray?: boolean;
            isPaginated?: boolean;
        };
        badRequest?: string;
        unauthorized?: string;
        forbidden?: string;
        notFound?: string;
        internalServerError?: string;
    };
    params?: Array<{
        name: string;
        description: string;
        example?: unknown;
        required?: boolean;
    }>;
    queries?: Array<{
        name: string;
        description: string;
        example?: unknown;
        required?: boolean;
        type?: 'string' | 'number' | 'boolean';
    }>;
    body?: {
        type: Type<any>;
        description?: string;
    };
}
export declare function ApiDocs(options: ApiDocsOptions): <TFunction extends Function, Y>(target: TFunction | object, propertyKey?: string | symbol, descriptor?: TypedPropertyDescriptor<Y>) => void;
export declare function ApiPaginatedQuery(dataType: Type<any>, summary: string, description?: string): <TFunction extends Function, Y>(target: TFunction | object, propertyKey?: string | symbol, descriptor?: TypedPropertyDescriptor<Y>) => void;
export declare function ApiCreateResource(dataType: Type<any>, requestType: Type<any>, summary: string): <TFunction extends Function, Y>(target: TFunction | object, propertyKey?: string | symbol, descriptor?: TypedPropertyDescriptor<Y>) => void;
export declare function ApiUpdateResource(dataType: Type<any>, requestType: Type<any>, summary: string): <TFunction extends Function, Y>(target: TFunction | object, propertyKey?: string | symbol, descriptor?: TypedPropertyDescriptor<Y>) => void;
export declare function ApiDeleteResource(summary: string): <TFunction extends Function, Y>(target: TFunction | object, propertyKey?: string | symbol, descriptor?: TypedPropertyDescriptor<Y>) => void;
export declare function ApiGetResource(dataType: Type<any>, summary: string): <TFunction extends Function, Y>(target: TFunction | object, propertyKey?: string | symbol, descriptor?: TypedPropertyDescriptor<Y>) => void;
