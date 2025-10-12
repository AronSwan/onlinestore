import { Test, TestingModule } from '@nestjs/testing';
import { ResponseWrapperService } from './response-wrapper.service';

describe('ResponseWrapperService', () => {
  let service: ResponseWrapperService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ResponseWrapperService],
    }).compile();

    service = module.get<ResponseWrapperService>(ResponseWrapperService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('wrapSuccessResponse', () => {
    it('should wrap success responses correctly', () => {
      const data = { test: 'data' };
      const requestId = 'test-request-id';
      const metadata = { operation: 'test' };
      
      const result = service.wrapSuccessResponse(data, requestId, metadata);
      
      expect(result.success).toBe(true);
      expect(result.data).toBe(data);
      expect(result.requestId).toBe(requestId);
      expect(result.metadata).toBe(metadata);
      expect(result.timestamp).toBeDefined();
    });

    it('should work without metadata', () => {
      const data = { test: 'data' };
      const requestId = 'test-request-id';
      
      const result = service.wrapSuccessResponse(data, requestId);
      
      expect(result.success).toBe(true);
      expect(result.data).toBe(data);
      expect(result.requestId).toBe(requestId);
      expect(result.timestamp).toBeDefined();
      expect(result.metadata).toBeUndefined();
    });

    it('should work without requestId', () => {
      const data = { test: 'data' };
      
      const result = service.wrapSuccessResponse(data);
      
      expect(result.success).toBe(true);
      expect(result.data).toBe(data);
      expect(result.timestamp).toBeDefined();
      expect(result.requestId).toBeUndefined();
      expect(result.metadata).toBeUndefined();
    });
  });

  describe('wrapErrorResponse', () => {
    it('should wrap error responses correctly', () => {
      const error = { code: 'TEST_ERROR', message: 'Test error message' };
      const requestId = 'test-request-id';
      const operation = 'test-operation';
      
      const result = service.wrapErrorResponse(error, requestId, operation);
      
      expect(result.success).toBe(false);
      expect(result.error.code).toBe('TEST_ERROR');
      expect(result.error.message).toBe('Test error message');
      expect(result.requestId).toBe(requestId);
      expect(result.operation).toBe(operation);
      expect(result.timestamp).toBeDefined();
    });

    it('should work without operation', () => {
      const error = { code: 'TEST_ERROR', message: 'Test error message' };
      const requestId = 'test-request-id';
      
      const result = service.wrapErrorResponse(error, requestId);
      
      expect(result.success).toBe(false);
      expect(result.error.code).toBe('TEST_ERROR');
      expect(result.error.message).toBe('Test error message');
      expect(result.requestId).toBe(requestId);
      expect(result.timestamp).toBeDefined();
      expect(result.operation).toBeUndefined();
    });

    it('should work without requestId', () => {
      const error = { code: 'TEST_ERROR', message: 'Test error message' };
      
      const result = service.wrapErrorResponse(error);
      
      expect(result.success).toBe(false);
      expect(result.error.code).toBe('TEST_ERROR');
      expect(result.error.message).toBe('Test error message');
      expect(result.timestamp).toBeDefined();
      expect(result.requestId).toBeUndefined();
      expect(result.operation).toBeUndefined();
    });

    it('should handle error without code', () => {
      const error = { message: 'Test error message' };
      const requestId = 'test-request-id';
      
      const result = service.wrapErrorResponse(error, requestId);
      
      expect(result.success).toBe(false);
      expect(result.error.code).toBe('UNKNOWN_ERROR');
      expect(result.error.message).toBe('Test error message');
      expect(result.requestId).toBe(requestId);
      expect(result.timestamp).toBeDefined();
    });

    it('should handle error without message', () => {
      const error = { code: 'TEST_ERROR' };
      const requestId = 'test-request-id';
      
      const result = service.wrapErrorResponse(error, requestId);
      
      expect(result.success).toBe(false);
      expect(result.error.code).toBe('TEST_ERROR');
      expect(result.error.message).toBe('An unknown error occurred');
      expect(result.requestId).toBe(requestId);
      expect(result.timestamp).toBeDefined();
    });
  });

  describe('wrapPaginatedResponse', () => {
    it('should wrap paginated responses correctly', () => {
      const data = [{ id: 1 }, { id: 2 }];
      const total = 10;
      const page = 1;
      const limit = 5;
      const requestId = 'test-request-id';
      
      const result = service.wrapPaginatedResponse(data, total, page, limit, requestId);
      
      expect(result.success).toBe(true);
      expect(result.data).toBe(data);
      expect(result.pagination.total).toBe(total);
      expect(result.pagination.page).toBe(page);
      expect(result.pagination.limit).toBe(limit);
      expect(result.pagination.totalPages).toBe(2);
      expect(result.pagination.hasNext).toBe(true);
      expect(result.pagination.hasPrev).toBe(false);
      expect(result.requestId).toBe(requestId);
      expect(result.timestamp).toBeDefined();
    });

    it('should handle last page correctly', () => {
      const data = [{ id: 1 }, { id: 2 }];
      const total = 10;
      const page = 2;
      const limit = 5;
      const requestId = 'test-request-id';
      
      const result = service.wrapPaginatedResponse(data, total, page, limit, requestId);
      
      expect(result.success).toBe(true);
      expect(result.data).toBe(data);
      expect(result.pagination.total).toBe(total);
      expect(result.pagination.page).toBe(page);
      expect(result.pagination.limit).toBe(limit);
      expect(result.pagination.totalPages).toBe(2);
      expect(result.pagination.hasNext).toBe(false);
      expect(result.pagination.hasPrev).toBe(true);
      expect(result.requestId).toBe(requestId);
      expect(result.timestamp).toBeDefined();
    });

    it('should handle single page correctly', () => {
      const data = [{ id: 1 }, { id: 2 }];
      const total = 2;
      const page = 1;
      const limit = 5;
      const requestId = 'test-request-id';
      
      const result = service.wrapPaginatedResponse(data, total, page, limit, requestId);
      
      expect(result.success).toBe(true);
      expect(result.data).toBe(data);
      expect(result.pagination.total).toBe(total);
      expect(result.pagination.page).toBe(page);
      expect(result.pagination.limit).toBe(limit);
      expect(result.pagination.totalPages).toBe(1);
      expect(result.pagination.hasNext).toBe(false);
      expect(result.pagination.hasPrev).toBe(false);
      expect(result.requestId).toBe(requestId);
      expect(result.timestamp).toBeDefined();
    });
  });

  describe('wrapStreamResponse', () => {
    it('should wrap stream responses correctly', () => {
      const stream = { read: jest.fn() };
      const requestId = 'test-request-id';
      
      const result = service.wrapStreamResponse(stream, requestId);
      
      expect(result.success).toBe(true);
      expect(result.stream).toBe(stream);
      expect(result.requestId).toBe(requestId);
      expect(result.type).toBe('stream');
      expect(result.timestamp).toBeDefined();
    });

    it('should work without requestId', () => {
      const stream = { read: jest.fn() };
      
      const result = service.wrapStreamResponse(stream);
      
      expect(result.success).toBe(true);
      expect(result.stream).toBe(stream);
      expect(result.type).toBe('stream');
      expect(result.timestamp).toBeDefined();
      expect(result.requestId).toBeUndefined();
    });
  });

  describe('createStandardResponse', () => {
    it('should create standard responses correctly', () => {
      const success = true;
      const data = { test: 'data' };
      const message = 'Test message';
      const requestId = 'test-request-id';
      const metadata = { operation: 'test' };
      
      const result = service.createStandardResponse(success, data, message, requestId, metadata);
      
      expect(result.success).toBe(success);
      expect(result.data).toBe(data);
      expect(result.message).toBe(message);
      expect(result.requestId).toBe(requestId);
      expect(result.metadata).toBe(metadata);
      expect(result.timestamp).toBeDefined();
    });

    it('should work with minimal parameters', () => {
      const success = true;
      
      const result = service.createStandardResponse(success);
      
      expect(result.success).toBe(success);
      expect(result.timestamp).toBeDefined();
      expect(result.data).toBeUndefined();
      expect(result.message).toBeUndefined();
      expect(result.requestId).toBeUndefined();
      expect(result.metadata).toBeUndefined();
    });

    it('should work with false success', () => {
      const success = false;
      const message = 'Error message';
      
      const result = service.createStandardResponse(success, undefined, message);
      
      expect(result.success).toBe(success);
      expect(result.message).toBe(message);
      expect(result.timestamp).toBeDefined();
      expect(result.data).toBeUndefined();
      expect(result.requestId).toBeUndefined();
      expect(result.metadata).toBeUndefined();
    });
  });
});