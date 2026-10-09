"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiDocs = ApiDocs;
exports.ApiPaginatedQuery = ApiPaginatedQuery;
exports.ApiCreateResource = ApiCreateResource;
exports.ApiUpdateResource = ApiUpdateResource;
exports.ApiDeleteResource = ApiDeleteResource;
exports.ApiGetResource = ApiGetResource;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
function ApiDocs(options) {
    const decorators = [
        (0, swagger_1.ApiOperation)({
            summary: options.summary,
            description: options.description,
        }),
    ];
    if (options.auth) {
        decorators.push((0, swagger_1.ApiBearerAuth)(), (0, swagger_1.ApiUnauthorizedResponse)({
            description: (options.responses?.unauthorized || '未授权访问') + '（problem+json）',
        }), (0, swagger_1.ApiForbiddenResponse)({
            description: (options.responses?.forbidden || '权限不足') + '（problem+json）',
        }));
    }
    if (options.responses?.success) {
        const { type, description, isArray, isPaginated } = options.responses.success;
        if (isPaginated && type) {
            decorators.push((0, swagger_1.ApiResponse)({
                status: 200,
                description: description || '操作成功',
                schema: {
                    type: 'object',
                    properties: {
                        items: {
                            type: 'array',
                            items: { $ref: (0, swagger_1.getSchemaPath)(type) },
                        },
                        total: { type: 'number' },
                        page: { type: 'number' },
                        limit: { type: 'number' },
                    },
                },
            }));
        }
        else if (isArray && type) {
            decorators.push((0, swagger_1.ApiResponse)({
                status: 200,
                description: description || '操作成功',
                schema: {
                    type: 'array',
                    items: { $ref: (0, swagger_1.getSchemaPath)(type) },
                },
            }));
        }
        else if (type) {
            decorators.push((0, swagger_1.ApiResponse)({
                status: 200,
                description: description || '操作成功',
                schema: { $ref: (0, swagger_1.getSchemaPath)(type) },
            }));
        }
        else {
            decorators.push((0, swagger_1.ApiResponse)({
                status: 200,
                description: description || '操作成功',
            }));
        }
    }
    if (options.responses?.badRequest) {
        decorators.push((0, swagger_1.ApiBadRequestResponse)({
            description: options.responses.badRequest + '（RFC 9457 problem+json）',
            content: { 'application/problem+json': { schema: { $ref: (0, swagger_1.getSchemaPath)('ProblemDetails') } } },
        }));
    }
    if (options.responses?.notFound) {
        decorators.push((0, swagger_1.ApiNotFoundResponse)({
            description: options.responses.notFound + '（RFC 9457 problem+json）',
            content: { 'application/problem+json': { schema: { $ref: (0, swagger_1.getSchemaPath)('ProblemDetails') } } },
        }));
    }
    if (options.responses?.internalServerError) {
        decorators.push((0, swagger_1.ApiInternalServerErrorResponse)({
            description: options.responses.internalServerError + '（problem+json）',
        }));
    }
    if (options.params) {
        options.params.forEach(param => {
            decorators.push((0, swagger_1.ApiParam)({
                name: param.name,
                description: param.description,
                example: param.example,
                required: param.required !== false,
            }));
        });
    }
    if (options.queries) {
        options.queries.forEach(query => {
            decorators.push((0, swagger_1.ApiQuery)({
                name: query.name,
                description: query.description,
                example: query.example,
                required: query.required === true,
                type: query.type || 'string',
            }));
        });
    }
    if (options.body) {
        decorators.push((0, swagger_1.ApiBody)({
            type: options.body.type,
            description: options.body.description,
        }));
    }
    return (0, common_1.applyDecorators)(...decorators);
}
function ApiPaginatedQuery(dataType, summary, description) {
    return ApiDocs({
        summary,
        description,
        auth: true,
        responses: {
            success: {
                type: dataType,
                isPaginated: true,
                description: '查询成功',
            },
            badRequest: '查询参数错误',
            unauthorized: '未授权访问',
            forbidden: '权限不足',
        },
        queries: [
            {
                name: 'page',
                description: '页码',
                example: 1,
                required: false,
                type: 'number',
            },
            {
                name: 'limit',
                description: '每页数量',
                example: 20,
                required: false,
                type: 'number',
            },
            {
                name: 'sort',
                description: '排序字段',
                example: 'createdAt',
                required: false,
            },
            {
                name: 'order',
                description: '排序方向',
                example: 'DESC',
                required: false,
            },
        ],
    });
}
function ApiCreateResource(dataType, requestType, summary) {
    return ApiDocs({
        summary,
        auth: true,
        responses: {
            success: {
                type: dataType,
                description: '创建成功',
            },
            badRequest: '请求参数错误',
            unauthorized: '未授权访问',
            forbidden: '权限不足',
        },
        body: {
            type: requestType,
            description: '创建资源的请求数据',
        },
    });
}
function ApiUpdateResource(dataType, requestType, summary) {
    return ApiDocs({
        summary,
        auth: true,
        responses: {
            success: {
                type: dataType,
                description: '更新成功',
            },
            badRequest: '请求参数错误',
            unauthorized: '未授权访问',
            forbidden: '权限不足',
            notFound: '资源不存在',
        },
        body: {
            type: requestType,
            description: '更新资源的请求数据',
        },
    });
}
function ApiDeleteResource(summary) {
    return ApiDocs({
        summary,
        auth: true,
        responses: {
            success: {
                description: '删除成功',
            },
            unauthorized: '未授权访问',
            forbidden: '权限不足',
            notFound: '资源不存在',
        },
    });
}
function ApiGetResource(dataType, summary) {
    return ApiDocs({
        summary,
        auth: true,
        responses: {
            success: {
                type: dataType,
                description: '获取成功',
            },
            unauthorized: '未授权访问',
            forbidden: '权限不足',
            notFound: '资源不存在',
        },
    });
}
