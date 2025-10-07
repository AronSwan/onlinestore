// 用途：认证服务单元测试
// 依赖文件：auth.service.ts, users.service.ts, unified-master.config.ts
// 作者：后端开发团队
// 时间：2025-06-17 12:00:00

import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';

import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { User, UserRole } from '../users/entities/user.entity';
import { RedisHealthService } from '../redis/redis-health.service';
import { CaptchaService } from './captcha.service';
import { createMasterConfiguration } from '../config/unified-master.config';

// Create configuration instance
const masterConfig = createMasterConfiguration();

// Mock bcrypt
jest.mock('bcrypt');
const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt> & {
  hash: jest.Mock;
  compare: jest.Mock;
};

// Mock User entity
const mockUser = {
  id: 1,
  email: 'test@example.com',
  username: 'testuser',
  password: 'hashedPassword',
  role: UserRole.USER,
  createdAt: new Date(),
  updatedAt: new Date(),
};

// Mock UsersService
const mockUsersService = {
  findByEmail: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
};

// Mock UserRepository
const mockUserRepository = {
  update: jest.fn(),
};

// Mock RedisHealthService
const mockRedisHealthService = {
  getClient: jest.fn(),
};

// Mock Redis client
const mockRedisClient = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  multi: jest.fn(),
  incr: jest.fn(),
  expire: jest.fn(),
  exec: jest.fn(),
};

// Mock JwtService
const mockJwtService = {
  sign: jest.fn(),
  verify: jest.fn(),
};

// Mock CaptchaService
const mockCaptchaService = {
  verify: jest.fn(),
};

describe('AuthService', () => {
  let service: AuthService;
  let usersService: UsersService;
  let jwtService: JwtService;
  let userRepository: Repository<User>;
  let redisHealth: RedisHealthService;
  let captchaService: CaptchaService;

  const originalEnv = process.env;

  beforeEach(async () => {
    jest.resetModules();
    jest.clearAllMocks();
    process.env = { ...originalEnv };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: RedisHealthService,
          useValue: mockRedisHealthService,
        },
        {
          provide: CaptchaService,
          useValue: mockCaptchaService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get<UsersService>(UsersService);
    jwtService = module.get<JwtService>(JwtService);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    redisHealth = module.get<RedisHealthService>(RedisHealthService);
    captchaService = module.get<CaptchaService>(CaptchaService);

    // Reset all mock functions
    Object.values(mockUsersService).forEach(mock => mock.mockReset());
    Object.values(mockUserRepository).forEach(mock => mock.mockReset());
    Object.values(mockRedisHealthService).forEach(mock => mock.mockReset());
    Object.values(mockJwtService).forEach(mock => mock.mockReset());
    Object.values(mockCaptchaService).forEach(mock => mock.mockReset());
    Object.values(mockRedisClient).forEach(mock => mock.mockReset());
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Service Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should have all dependencies injected', () => {
      expect(usersService).toBeDefined();
      expect(jwtService).toBeDefined();
      expect(userRepository).toBeDefined();
      expect(redisHealth).toBeDefined();
      expect(captchaService).toBeDefined();
    });
  });

  describe('Register', () => {
    const registerData = {
      email: 'test@example.com',
      password: 'password123',
      username: 'testuser',
    };

    it('should successfully register a new user', async () => {
      // Setup mocks
      mockUsersService.findByEmail.mockResolvedValue(null);
      mockedBcrypt.hash.mockResolvedValue('hashedPassword');
      mockUsersService.create.mockResolvedValue(mockUser);
      mockJwtService.sign.mockReturnValue('accessToken');
      mockRedisHealthService.getClient.mockReturnValue(mockRedisClient);
      mockRedisClient.get.mockResolvedValue('0');

      const result = await service.register(registerData);

      expect(result).toEqual({
        access_token: 'accessToken',
        refresh_token: 'accessToken',
        expires_in: 900,
        user: {
          id: mockUser.id,
          email: mockUser.email,
          username: mockUser.username,
          role: mockUser.role,
        },
      });

      expect(mockUsersService.findByEmail).toHaveBeenCalledWith(registerData.email);
      expect(mockedBcrypt.hash).toHaveBeenCalledWith(registerData.password, 12);
      expect(mockUsersService.create).toHaveBeenCalledWith({
        ...registerData,
        password: 'hashedPassword',
        role: UserRole.USER,
      });
    });

    it('should throw ConflictException when user already exists', async () => {
      mockUsersService.findByEmail.mockResolvedValue(mockUser);
      mockRedisHealthService.getClient.mockReturnValue(mockRedisClient);
      mockRedisClient.get.mockResolvedValue('0');
      mockRedisClient.multi.mockReturnValue(mockRedisClient);
      mockRedisClient.incr.mockReturnValue(mockRedisClient);
      mockRedisClient.expire.mockReturnValue(mockRedisClient);
      mockRedisClient.exec.mockResolvedValue(['OK']);

      await expect(service.register(registerData)).rejects.toThrow(ConflictException);
      expect(mockUsersService.findByEmail).toHaveBeenCalledWith(registerData.email);
    });

    it('should require captcha when registration fails exceed threshold', async () => {
      const registerDataWithCaptcha = {
        ...registerData,
        captcha_token: 'valid_captcha_token',
      };

      mockUsersService.findByEmail.mockResolvedValue(mockUser);
      mockRedisHealthService.getClient.mockReturnValue(mockRedisClient);
      mockRedisClient.get.mockResolvedValue('5'); // At threshold
      mockRedisClient.multi.mockReturnValue(mockRedisClient);
      mockRedisClient.incr.mockReturnValue(mockRedisClient);
      mockRedisClient.expire.mockReturnValue(mockRedisClient);
      mockRedisClient.exec.mockResolvedValue(['OK']);
      mockCaptchaService.verify.mockResolvedValue(true);

      await expect(service.register(registerDataWithCaptcha)).rejects.toThrow(ConflictException);
      expect(mockCaptchaService.verify).toHaveBeenCalledWith('valid_captcha_token');
    });

    it('should throw BadRequestException when captcha is required but not provided', async () => {
      mockUsersService.findByEmail.mockResolvedValue(mockUser);
      mockRedisHealthService.getClient.mockReturnValue(mockRedisClient);
      mockRedisClient.get.mockResolvedValue('5'); // At threshold

      await expect(service.register(registerData)).rejects.toThrow(BadRequestException);
      expect(mockCaptchaService.verify).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when captcha verification fails', async () => {
      const registerDataWithCaptcha = {
        ...registerData,
        captcha_token: 'invalid_captcha_token',
      };

      mockUsersService.findByEmail.mockResolvedValue(mockUser);
      mockRedisHealthService.getClient.mockReturnValue(mockRedisClient);
      mockRedisClient.get.mockResolvedValue('5'); // At threshold
      mockCaptchaService.verify.mockResolvedValue(false);

      await expect(service.register(registerDataWithCaptcha)).rejects.toThrow(BadRequestException);
    });

    it('should clear registration failure counter on successful registration', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);
      mockedBcrypt.hash.mockResolvedValue('hashedPassword');
      mockUsersService.create.mockResolvedValue(mockUser);
      mockJwtService.sign.mockReturnValue('accessToken');
      mockRedisHealthService.getClient.mockReturnValue(mockRedisClient);
      mockRedisClient.get.mockResolvedValue('3');
      mockRedisClient.del.mockResolvedValue(1);

      await service.register(registerData);

      expect(mockRedisClient.del).toHaveBeenCalledWith(`auth:reg:fail:${registerData.email}`);
    });

    it('should handle registration without Redis', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);
      mockedBcrypt.hash.mockResolvedValue('hashedPassword');
      mockUsersService.create.mockResolvedValue(mockUser);
      mockJwtService.sign.mockReturnValue('accessToken');
      mockRedisHealthService.getClient.mockReturnValue(undefined);

      const result = await service.register(registerData);

      expect(result).toBeDefined();
      expect(mockUsersService.create).toHaveBeenCalledWith({
        ...registerData,
        password: 'hashedPassword',
        role: UserRole.USER,
      });
    });
  });

  describe('Login', () => {
    const loginData = {
      email: 'test@example.com',
      password: 'password123',
    };

    it('should successfully login with valid credentials', async () => {
      mockUsersService.findByEmail.mockResolvedValue(mockUser);
      mockedBcrypt.compare.mockResolvedValue(true);
      mockJwtService.sign.mockReturnValue('accessToken');
      mockRedisHealthService.getClient.mockReturnValue(mockRedisClient);
      mockRedisClient.get.mockResolvedValue('0');

      const result = await service.login(loginData);

      expect(result).toEqual({
        access_token: 'accessToken',
        refresh_token: 'accessToken',
        expires_in: 900,
        user: {
          id: mockUser.id,
          email: mockUser.email,
          username: mockUser.username,
          role: mockUser.role,
        },
      });

      expect(mockUsersService.findByEmail).toHaveBeenCalledWith(loginData.email);
      expect(mockedBcrypt.compare).toHaveBeenCalledWith(loginData.password, mockUser.password);
    });

    it('should throw UnauthorizedException when user does not exist', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);
      mockRedisHealthService.getClient.mockReturnValue(mockRedisClient);
      mockRedisClient.multi.mockReturnValue(mockRedisClient);
      mockRedisClient.incr.mockReturnValue(mockRedisClient);
      mockRedisClient.expire.mockReturnValue(mockRedisClient);
      mockRedisClient.exec.mockResolvedValue(['OK']);

      await expect(service.login(loginData)).rejects.toThrow(UnauthorizedException);
      expect(mockUsersService.findByEmail).toHaveBeenCalledWith(loginData.email);
    });

    it('should throw UnauthorizedException when password is invalid', async () => {
      mockUsersService.findByEmail.mockResolvedValue(mockUser);
      mockedBcrypt.compare.mockResolvedValue(false);
      mockRedisHealthService.getClient.mockReturnValue(mockRedisClient);
      mockRedisClient.multi.mockReturnValue(mockRedisClient);
      mockRedisClient.incr.mockReturnValue(mockRedisClient);
      mockRedisClient.expire.mockReturnValue(mockRedisClient);
      mockRedisClient.exec.mockResolvedValue(['OK']);

      await expect(service.login(loginData)).rejects.toThrow(UnauthorizedException);
      expect(mockedBcrypt.compare).toHaveBeenCalledWith(loginData.password, mockUser.password);
    });

    it('should require captcha when login failures exceed threshold', async () => {
      const loginDataWithCaptcha = {
        ...loginData,
        captcha_token: 'valid_captcha_token',
      };

      mockUsersService.findByEmail.mockResolvedValue(mockUser);
      mockedBcrypt.compare.mockResolvedValue(true);
      mockRedisHealthService.getClient.mockReturnValue(mockRedisClient);
      mockRedisClient.get.mockResolvedValue('5'); // At threshold
      mockCaptchaService.verify.mockResolvedValue(true);
      mockJwtService.sign.mockReturnValue('accessToken');

      const result = await service.login(loginDataWithCaptcha);

      expect(result).toBeDefined();
      expect(mockCaptchaService.verify).toHaveBeenCalledWith('valid_captcha_token');
    });

    it('should throw BadRequestException when captcha is required but not provided', async () => {
      mockUsersService.findByEmail.mockResolvedValue(mockUser);
      mockRedisHealthService.getClient.mockReturnValue(mockRedisClient);
      mockRedisClient.get.mockResolvedValue('5'); // At threshold

      await expect(service.login(loginData)).rejects.toThrow(BadRequestException);
    });

    it('should clear login failure counter on successful login', async () => {
      mockUsersService.findByEmail.mockResolvedValue(mockUser);
      mockedBcrypt.compare.mockResolvedValue(true);
      mockJwtService.sign.mockReturnValue('accessToken');
      mockRedisHealthService.getClient.mockReturnValue(mockRedisClient);
      mockRedisClient.get.mockResolvedValue('3');
      mockRedisClient.del.mockResolvedValue(1);

      await service.login(loginData);

      expect(mockRedisClient.del).toHaveBeenCalledWith(`auth:login:fail:${loginData.email}`);
    });

    it('should handle login without Redis', async () => {
      mockUsersService.findByEmail.mockResolvedValue(mockUser);
      mockedBcrypt.compare.mockResolvedValue(true);
      mockJwtService.sign.mockReturnValue('accessToken');
      mockRedisHealthService.getClient.mockReturnValue(undefined);

      const result = await service.login(loginData);

      expect(result).toBeDefined();
    });
  });

  describe('RefreshToken', () => {
    const refreshToken = 'valid_refresh_token';
    const payload = { sub: mockUser.id, email: mockUser.email, role: mockUser.role };

    it('should successfully refresh token with valid refresh token', async () => {
      mockJwtService.verify.mockReturnValue(payload);
      mockUsersService.findById.mockResolvedValue(mockUser);
      mockJwtService.sign.mockReturnValue('newAccessToken');

      const result = await service.refreshToken(refreshToken);

      expect(result).toEqual({
        access_token: 'newAccessToken',
        refresh_token: 'newAccessToken',
        expires_in: 900,
        user: {
          id: mockUser.id,
          email: mockUser.email,
          username: mockUser.username,
          role: mockUser.role,
        },
      });

      expect(mockJwtService.verify).toHaveBeenCalledWith(refreshToken, {
        secret: masterConfig.jwt.secret,
      });
      expect(mockUsersService.findById).toHaveBeenCalledWith(payload.sub);
    });

    it('should throw UnauthorizedException when refresh token is invalid', async () => {
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(service.refreshToken(refreshToken)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when user does not exist', async () => {
      mockJwtService.verify.mockReturnValue(payload);
      mockUsersService.findById.mockResolvedValue(null);

      await expect(service.refreshToken(refreshToken)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('ValidateToken', () => {
    const validToken = 'valid_token';

    it('should successfully validate a valid token', async () => {
      const payload = { sub: 1, email: 'test@example.com' };
      mockJwtService.verify.mockReturnValue(payload);

      const result = await service.validateToken(validToken);

      expect(result).toEqual(payload);
      expect(mockJwtService.verify).toHaveBeenCalledWith(validToken);
    });

    it('should throw UnauthorizedException when token is invalid', async () => {
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(service.validateToken(validToken)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('ChangePassword', () => {
    const changePasswordData = {
      userId: 1,
      oldPassword: 'oldPassword123',
      newPassword: 'newPassword123',
    };

    it('should successfully change password', async () => {
      mockUsersService.findById.mockResolvedValue(mockUser);
      mockedBcrypt.compare.mockResolvedValue(true);
      mockedBcrypt.hash.mockResolvedValue('newHashedPassword');
      mockUserRepository.update.mockResolvedValue({ affected: 1 });

      await service.changePassword(changePasswordData);

      expect(mockUsersService.findById).toHaveBeenCalledWith(changePasswordData.userId);
      expect(mockedBcrypt.compare).toHaveBeenCalledWith(
        changePasswordData.oldPassword,
        mockUser.password,
      );
      expect(mockedBcrypt.hash).toHaveBeenCalledWith(changePasswordData.newPassword, 12);
      expect(mockUserRepository.update).toHaveBeenCalledWith(changePasswordData.userId, {
        password: 'newHashedPassword',
      });
    });

    it('should throw UnauthorizedException when user does not exist', async () => {
      mockUsersService.findById.mockResolvedValue(null);

      await expect(service.changePassword(changePasswordData)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when old password is invalid', async () => {
      mockUsersService.findById.mockResolvedValue(mockUser);
      mockedBcrypt.compare.mockResolvedValue(false);

      await expect(service.changePassword(changePasswordData)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('GenerateTokens', () => {
    it('should generate correct token response', async () => {
      mockJwtService.sign.mockReturnValue('accessToken');

      // Access private method through service instance
      const result = await (service as any).generateTokens(mockUser);

      expect(result).toEqual({
        access_token: 'accessToken',
        refresh_token: 'accessToken',
        expires_in: 900,
        user: {
          id: mockUser.id,
          email: mockUser.email,
          username: mockUser.username,
          role: mockUser.role,
        },
      });

      expect(mockJwtService.sign).toHaveBeenCalledWith({
        sub: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
      });

      expect(mockJwtService.sign).toHaveBeenCalledWith(
        {
          sub: mockUser.id,
          email: mockUser.email,
          role: mockUser.role,
        },
        {
          expiresIn: masterConfig.jwt.refreshExpiresIn,
        },
      );
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complete registration and login workflow', async () => {
      const registerData = {
        email: 'newuser@example.com',
        password: 'password123',
        username: 'newuser',
      };

      const loginData = {
        email: 'newuser@example.com',
        password: 'password123',
      };

      // Registration
      mockUsersService.findByEmail.mockResolvedValue(null);
      mockedBcrypt.hash.mockResolvedValue('hashedPassword');
      mockUsersService.create.mockResolvedValue({
        ...mockUser,
        email: 'newuser@example.com',
        username: 'newuser',
      });
      mockJwtService.sign.mockReturnValue('accessToken');
      mockRedisHealthService.getClient.mockReturnValue(mockRedisClient);
      mockRedisClient.get.mockResolvedValue('0');

      const registerResult = await service.register(registerData);
      expect(registerResult).toBeDefined();

      // Login
      mockUsersService.findByEmail.mockResolvedValue({
        ...mockUser,
        email: 'newuser@example.com',
        username: 'newuser',
      });
      mockedBcrypt.compare.mockResolvedValue(true);
      mockRedisClient.get.mockResolvedValue('0');

      const loginResult = await service.login(loginData);
      expect(loginResult).toBeDefined();

      // Token refresh
      mockJwtService.verify.mockReturnValue({
        sub: mockUser.id,
        email: 'newuser@example.com',
        role: mockUser.role,
      });
      mockUsersService.findById.mockResolvedValue({
        ...mockUser,
        email: 'newuser@example.com',
        username: 'newuser',
      });

      const refreshResult = await service.refreshToken('valid_refresh_token');
      expect(refreshResult).toBeDefined();
    });

    it('should handle rate limiting scenarios', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };

      // Multiple failed login attempts
      mockUsersService.findByEmail.mockResolvedValue(mockUser);
      mockedBcrypt.compare.mockResolvedValue(false);
      mockRedisHealthService.getClient.mockReturnValue(mockRedisClient);
      mockRedisClient.get.mockResolvedValue('4'); // One below threshold
      mockRedisClient.multi.mockReturnValue(mockRedisClient);
      mockRedisClient.incr.mockReturnValue(mockRedisClient);
      mockRedisClient.expire.mockReturnValue(mockRedisClient);
      mockRedisClient.exec.mockResolvedValue(['OK']);

      // This should increment to threshold
      await expect(service.login(loginData)).rejects.toThrow(UnauthorizedException);

      // Next attempt should require captcha
      mockRedisClient.get.mockResolvedValue('5'); // At threshold

      await expect(service.login(loginData)).rejects.toThrow(BadRequestException);
    });
  });

  describe('Error Handling', () => {
    it('should handle Redis connection errors gracefully', async () => {
      const registerData = {
        email: 'test@example.com',
        password: 'password123',
        username: 'testuser',
      };

      mockUsersService.findByEmail.mockResolvedValue(null);
      mockedBcrypt.hash.mockResolvedValue('hashedPassword');
      mockUsersService.create.mockResolvedValue(mockUser);
      mockJwtService.sign.mockReturnValue('accessToken');
      mockRedisHealthService.getClient.mockReturnValue(mockRedisClient);
      mockRedisClient.get.mockImplementation(() => {
        throw new Error('Redis connection failed');
      });
      mockRedisClient.del.mockResolvedValue(1);

      const result = await service.register(registerData);
      expect(result).toBeDefined();
    });

    it('should handle bcrypt errors gracefully', async () => {
      const registerData = {
        email: 'test@example.com',
        password: 'password123',
        username: 'testuser',
      };

      mockUsersService.findByEmail.mockResolvedValue(null);
      mockedBcrypt.hash.mockRejectedValue(new Error('Bcrypt error'));

      await expect(service.register(registerData)).rejects.toThrow();
    });

    it('should handle JWT errors gracefully', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'password123',
      };

      mockUsersService.findByEmail.mockResolvedValue(mockUser);
      mockedBcrypt.compare.mockResolvedValue(true);
      mockJwtService.sign.mockImplementation(() => {
        throw new Error('JWT error');
      });

      await expect(service.login(loginData)).rejects.toThrow();
    });
  });
});
