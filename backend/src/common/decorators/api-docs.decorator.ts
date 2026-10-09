import { applyDecorators, Type } from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
  ApiBearerAuth,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiInternalServerErrorResponse,
  getSchemaPath,
} from '@nestjs/swagger';

/**
 * API文档装饰器选项
 */
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

/**
 * 通用API文档装饰器
 */
export function ApiDocs(options: ApiDocsOptions) {
  const decorators = [
    ApiOperation({
      summary: options.summary,
      description: options.description,
    }),
  ];

  // 认证装饰器
  if (options.auth) {
    decorators.push(
      ApiBearerAuth(),
      ApiUnauthorizedResponse({
        description: (options.responses?.unauthorized || '未授权访问') + '（problem+json）',
      }),
      ApiForbiddenResponse({
        description: (options.responses?.forbidden || '权限不足') + '（problem+json）',
      }),
    );
  }

  // 成功响应
  if (options.responses?.success) {
    const { type, description, isArray, isPaginated } = options.responses.success;

    if (isPaginated && type) {
      decorators.push(
        ApiResponse({
          status: 200,
          description: description || '操作成功',
          // 自洽B修复(2026-10-09):S1 批废信封后装饰器仍宣称 ApiResponseDto 包装——
          // 两世界根修,成功响应一律裸形状
          schema: {
            type: 'object',
            properties: {
              items: {
                type: 'array',
                items: { $ref: getSchemaPath(type) },
              },
              total: { type: 'number' },
              page: { type: 'number' },
              limit: { type: 'number' },
            },
          },
        }),
      );
    } else if (isArray && type) {
      decorators.push(
        ApiResponse({
          status: 200,
          description: description || '操作成功',
          schema: {
            type: 'array',
            items: { $ref: getSchemaPath(type) },
          },
        }),
      );
    } else if (type) {
      decorators.push(
        ApiResponse({
          status: 200,
          description: description || '操作成功',
          schema: { $ref: getSchemaPath(type) },
        }),
      );
    } else {
      decorators.push(
        ApiResponse({
          status: 200,
          description: description || '操作成功',
        }),
      );
    }
  }

  // 错误响应
  if (options.responses?.badRequest) {
    decorators.push(
      ApiBadRequestResponse({
        description: options.responses.badRequest + '（RFC 9457 problem+json）',
        content: { 'application/problem+json': { schema: { $ref: getSchemaPath('ProblemDetails') } } },
      }),
    );
  }

  if (options.responses?.notFound) {
    decorators.push(
      ApiNotFoundResponse({
        description: options.responses.notFound + '（RFC 9457 problem+json）',
        content: { 'application/problem+json': { schema: { $ref: getSchemaPath('ProblemDetails') } } },
      }),
    );
  }

  if (options.responses?.internalServerError) {
    decorators.push(
      ApiInternalServerErrorResponse({
        description: options.responses.internalServerError + '（problem+json）',
      }),
    );
  }

  // 参数装饰器
  if (options.params) {
    options.params.forEach(param => {
      decorators.push(
        ApiParam({
          name: param.name,
          description: param.description,
          example: param.example,
          required: param.required !== false,
        }),
      );
    });
  }

  // 查询参数装饰器
  if (options.queries) {
    options.queries.forEach(query => {
      decorators.push(
        ApiQuery({
          name: query.name,
          description: query.description,
          example: query.example,
          required: query.required === true,
          type: query.type || 'string',
        }),
      );
    });
  }

  // 请求体装饰器
  if (options.body) {
    decorators.push(
      ApiBody({
        type: options.body.type,
        description: options.body.description,
      }),
    );
  }

  return applyDecorators(...decorators);
}

/**
 * 分页查询API装饰器
 */
export function ApiPaginatedQuery(dataType: Type<any>, summary: string, description?: string) {
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

/**
 * 创建资源API装饰器
 */
export function ApiCreateResource(dataType: Type<any>, requestType: Type<any>, summary: string) {
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

/**
 * 更新资源API装饰器
 */
export function ApiUpdateResource(dataType: Type<any>, requestType: Type<any>, summary: string) {
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

/**
 * 删除资源API装饰器
 */
export function ApiDeleteResource(summary: string) {
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

/**
 * 获取单个资源API装饰器
 */
export function ApiGetResource(dataType: Type<any>, summary: string) {
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
