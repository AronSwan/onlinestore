import { Test, TestingModule } from '@nestjs/testing';
import { JwtAuthGuard } from './jwt-auth.guard';
import { Reflector } from '@nestjs/core';
import { UnauthorizedException } from '@nestjs/common';
import { ExecutionContext } from '@nestjs/common';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let reflector: Reflector;

  const createMockContext = (headers: Record<string, string> = {}): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ headers }),
        getResponse: () => ({}),
      }),
      getHandler: jest.fn(),
      getClass: jest.fn(),
    } as any;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtAuthGuard,
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: jest.fn(),
            get: jest.fn(),
            getAll: jest.fn(),
            getAllAndMerge: jest.fn(),
          },
        },
      ],
    }).compile();

    guard = module.get<JwtAuthGuard>(JwtAuthGuard);
    reflector = module.get<Reflector>(Reflector);
  });

  describe('token extraction through canActivate', () => {
    it('should throw UnauthorizedException for missing authorization header', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
      const context = createMockContext({});

      try {
        await guard.canActivate(context);
        fail('Expected UnauthorizedException to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(UnauthorizedException);
        expect(error.message).toBe('JWT令牌缺失');
      }
    });

    it('should throw UnauthorizedException for invalid token format', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
      const context = createMockContext({ authorization: 'InvalidFormat' });

      try {
        await guard.canActivate(context);
        fail('Expected UnauthorizedException to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(UnauthorizedException);
        expect(error.message).toBe('JWT令牌缺失');
      }
    });

    it('should throw UnauthorizedException for missing Bearer prefix', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
      const context = createMockContext({ authorization: 'Token abc123' });

      try {
        await guard.canActivate(context);
        fail('Expected UnauthorizedException to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(UnauthorizedException);
        expect(error.message).toBe('JWT令牌缺失');
      }
    });

    it('should throw UnauthorizedException for Bearer without token', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
      const context = createMockContext({ authorization: 'Bearer' });

      try {
        await guard.canActivate(context);
        fail('Expected UnauthorizedException to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(UnauthorizedException);
        expect(error.message).toBe('JWT令牌缺失');
      }
    });
  });

  describe('canActivate', () => {
    it('should return true for public routes', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);
      const context = createMockContext();

      const result = await guard.canActivate(context);
      expect(result).toBe(true);
    });

    it('should throw UnauthorizedException when no authorization header is present', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
      const context = createMockContext({});

      try {
        await guard.canActivate(context);
        fail('Expected UnauthorizedException to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(UnauthorizedException);
        expect(error.message).toBe('JWT令牌缺失');
      }
    });
  });

  describe('handleRequest', () => {
    it('should throw UnauthorizedException for expired token', () => {
      const info = { name: 'TokenExpiredError' };
      expect(() => guard.handleRequest(null, null, info)).toThrow(UnauthorizedException);
      expect(() => guard.handleRequest(null, null, info)).toThrow('JWT令牌已过期');
    });

    it('should throw UnauthorizedException for invalid token', () => {
      const info = { name: 'JsonWebTokenError' };
      expect(() => guard.handleRequest(null, null, info)).toThrow(UnauthorizedException);
      expect(() => guard.handleRequest(null, null, info)).toThrow('无效的JWT令牌');
    });

    it('should throw UnauthorizedException for not-yet-active token', () => {
      const info = { name: 'NotBeforeError' };
      expect(() => guard.handleRequest(null, null, info)).toThrow(UnauthorizedException);
      expect(() => guard.handleRequest(null, null, info)).toThrow('JWT令牌尚未生效');
    });

    it('should return user for valid token', () => {
      const user = { id: 1, email: 'test@example.com' };
      const result = guard.handleRequest(null, user, null);
      expect(result).toBe(user);
    });

    it('should throw generic UnauthorizedException for other errors', () => {
      expect(() => guard.handleRequest(new Error('Some error'), null, null)).toThrow(
        UnauthorizedException,
      );
      expect(() => guard.handleRequest(new Error('Some error'), null, null)).toThrow('认证失败');
    });
  });
});
