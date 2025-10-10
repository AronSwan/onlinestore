// 用途：用户服务单元测试
// 依赖文件：users.service.ts, users.module.ts
// 作者：后端开发团队
// 时间：2025-09-29 23:55:00

declare const jest: any;
declare const describe: any;
declare const it: any;
declare const beforeEach: any;
declare const expect: any;
declare namespace jest {
  type Mock = any;
  type MockedFunction<T> = any;
}
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
jest.mock('bcrypt');
import { UsersService } from './users.service';
import { User, UserRole } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { MonitoringService } from '../monitoring/monitoring.service';
import { createMockRepository, createMockMonitoringService } from '../../test/test-setup-helper';

// Mock bcrypt functions
(jest as any).mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

describe('UsersService', () => {
  let service: UsersService;
  let userRepository: any;
  let monitoringService: MonitoringService;

  const mockUser = {
    id: 1,
    username: 'testuser',
    email: 'test@example.com',
    password: 'hashedPassword',
    role: UserRole.USER,
    isActive: true,
    avatar: 'avatar.jpg',
    phone: '1234567890',
    casdoorId: 'casdoor123',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockUserRepository = createMockRepository([mockUser]);
  const mockMonitoringService = createMockMonitoringService();

  beforeEach(async () => {
    (jest as any).clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: mockUserRepository },
        { provide: MonitoringService, useValue: mockMonitoringService },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    userRepository = module.get(getRepositoryToken(User));
    monitoringService = module.get<MonitoringService>(MonitoringService);
  });

  describe('create', () => {
    it('should successfully create a new user', async () => {
      const createUserDto: CreateUserDto = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
      };

      mockUserRepository.findOne.mockResolvedValue(null);
      (bcrypt.hash as unknown as any).mockImplementation(async () => 'hashedPassword');
      mockUserRepository.save.mockResolvedValue(mockUser);

      const result = await service.create(createUserDto);

      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
      expect(mockUserRepository.create).toHaveBeenCalledWith({
        ...createUserDto,
        password: 'hashedPassword',
      });
      expect(mockUserRepository.save).toHaveBeenCalled();
      expect(result).toEqual(
        expect.objectContaining({
          id: mockUser.id,
          username: mockUser.username,
          email: mockUser.email,
          role: mockUser.role,
        }),
      );
    });

    it('should throw ConflictException if email already exists', async () => {
      const createUserDto: CreateUserDto = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
      };

      mockUserRepository.findOne.mockResolvedValue(mockUser);

      await expect(service.create(createUserDto)).rejects.toThrow(new ConflictException());
    });
  });

  describe('findById', () => {
    it('should return a user by id', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.findById(1);

      expect(mockUserRepository.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(monitoringService.observeDbQuery).toHaveBeenCalledWith(
        'detail',
        'users',
        expect.any(Number),
      );
      expect(result).toEqual(mockUser);
    });

    it('should return null if user not found', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      const result = await service.findById(999);

      expect(result).toBeNull();
    });
  });

  describe('findOne', () => {
    it('should return a user by id', async () => {
      mockUserRepository.findOne.mockResolvedValueOnce(mockUser);

      const result = await service.findOne(1);

      expect(result).toEqual(mockUser);
    });

    it('should throw NotFoundException if user not found', async () => {
      mockUserRepository.findOne.mockResolvedValueOnce(null);

      await expect(service.findOne(999)).rejects.toThrow(new NotFoundException());
    });
  });

  describe('findByEmail', () => {
    it('should return a user by email', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.findByEmail('test@example.com');

      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
        select: [
          'id',
          'email',
          'password',
          'username',
          'role',
          'isActive',
          'avatar',
          'phone',
          'createdAt',
        ],
      });
      expect(monitoringService.observeDbQuery).toHaveBeenCalledWith(
        'detail',
        'users',
        expect.any(Number),
      );
      expect(result).toEqual(mockUser);
    });

    it('should return null if user not found', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      const result = await service.findByEmail('nonexistent@example.com');

      expect(result).toBeNull();
    });
  });

  describe('findByUsername', () => {
    it('should return a user by username', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.findByUsername('testuser');

      expect(mockUserRepository.findOne).toHaveBeenCalledWith({ where: { username: 'testuser' } });
      expect(monitoringService.observeDbQuery).toHaveBeenCalledWith(
        'detail',
        'users',
        expect.any(Number),
      );
      expect(result).toEqual(mockUser);
    });

    it('should return null if user not found', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      const result = await service.findByUsername('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findAll', () => {
    it('should return paginated users', async () => {
      const options = { page: 1, limit: 10, search: 'test' };
      const mockResult = { users: [mockUser], total: 1 };

      const queryBuilder = {
        where: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[mockUser], 1]),
      };

      mockUserRepository.createQueryBuilder.mockReturnValue(queryBuilder);

      const result = await service.findAll(options);

      expect(mockUserRepository.createQueryBuilder).toHaveBeenCalledWith('user');
      expect(queryBuilder.where).toHaveBeenCalledWith(
        'user.username LIKE :search OR user.email LIKE :search',
        { search: '%test%' },
      );
      expect(queryBuilder.skip).toHaveBeenCalledWith(0);
      expect(queryBuilder.take).toHaveBeenCalledWith(10);
      expect(queryBuilder.orderBy).toHaveBeenCalledWith('user.createdAt', 'DESC');
      expect(result).toEqual(mockResult);
    });

    it('should return all users without search', async () => {
      const options = { page: 1, limit: 10 };
      const mockResult = { users: [mockUser], total: 1 };

      const queryBuilder = {
        where: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[mockUser], 1]),
      };

      mockUserRepository.createQueryBuilder.mockReturnValue(queryBuilder);

      const result = await service.findAll(options);

      expect(queryBuilder.where).not.toHaveBeenCalled();
      expect(result).toEqual(mockResult);
    });
  });

  describe('update', () => {
    it('should successfully update a user', async () => {
      const updateUserDto: UpdateUserDto = {
        username: 'updateduser',
        avatar: 'newavatar.jpg',
      };

      const updatedUser = { ...mockUser, ...updateUserDto };
      mockUserRepository.findOne.mockResolvedValueOnce(mockUser);
      mockUserRepository.update.mockResolvedValue({ affected: 1 });
      mockUserRepository.findOne.mockResolvedValueOnce(updatedUser);

      const result = await service.update(1, updateUserDto);

      expect(mockUserRepository.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(mockUserRepository.update).toHaveBeenCalledWith(1, updateUserDto);
      expect(result).toEqual(updatedUser);
    });

    it('should throw NotFoundException if user not found', async () => {
      const updateUserDto: UpdateUserDto = {
        username: 'updateduser',
      };

      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(service.update(999, updateUserDto)).rejects.toThrow(new NotFoundException());
    });

    it('should hash password if provided', async () => {
      const updateUserDto: UpdateUserDto = {
        password: 'newpassword',
      };

      const updatedUser = { ...mockUser, password: 'newHashedPassword' };
      mockUserRepository.findOne.mockResolvedValueOnce(mockUser);
      mockUserRepository.update.mockResolvedValue({ affected: 1 });
      mockUserRepository.findOne.mockResolvedValueOnce(updatedUser);
      (bcrypt.hash as jest.Mock).mockResolvedValue('newHashedPassword');

      const result = await service.update(1, updateUserDto);

      expect(bcrypt.hash).toHaveBeenCalledWith('newpassword', 10);
      expect(result).toEqual(updatedUser);
    });
  });

  describe('delete', () => {
    it('should successfully delete a user', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockUserRepository.delete.mockResolvedValue({ affected: 1 });

      await service.delete(1);

      expect(mockUserRepository.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(mockUserRepository.delete).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundException if user not found', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(service.delete(999)).rejects.toThrow(new NotFoundException());
    });
  });

  describe('remove', () => {
    it('should successfully remove a user', async () => {
      mockUserRepository.findOne.mockResolvedValueOnce(mockUser);

      await service.remove(1);

      expect(mockUserRepository.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(mockUserRepository.remove).toHaveBeenCalledWith(mockUser);
    });

    it('should throw NotFoundException if user not found', async () => {
      mockUserRepository.findOne.mockResolvedValueOnce(null);

      await expect(service.remove(999)).rejects.toThrow(new NotFoundException());
    });
  });

  describe('updateLoginInfo', () => {
    it('should successfully update user login info', async () => {
      await service.updateLoginInfo(1);

      expect(mockUserRepository.update).toHaveBeenCalledWith(1, {
        lastLoginAt: expect.any(Date),
        loginCount: expect.any(Function),
      });
    });
  });

  describe('isEmailExists', () => {
    it('should return true if email exists', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.isEmailExists('test@example.com');

      expect(result).toBe(true);
    });

    it('should return false if email does not exist', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      const result = await service.isEmailExists('nonexistent@example.com');

      expect(result).toBe(false);
    });
  });

  describe('isUsernameExists', () => {
    it('should return true if username exists', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.isUsernameExists('testuser');

      expect(result).toBe(true);
    });

    it('should return false if username does not exist', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      const result = await service.isUsernameExists('nonexistent');

      expect(result).toBe(false);
    });
  });

  describe('getStatistics', () => {
    it('should return user statistics', async () => {
      mockUserRepository.count.mockResolvedValueOnce(100);
      mockUserRepository.count.mockResolvedValueOnce(80);

      const queryBuilder = {
        where: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(5),
      };

      mockUserRepository.createQueryBuilder.mockReturnValue(queryBuilder);

      const result = await service.getStatistics();

      expect(result).toEqual({
        totalUsers: 100,
        activeUsers: 80,
        newUsersToday: 5,
      });
      expect(monitoringService.observeDbQuery).toHaveBeenCalledWith(
        'aggregation',
        'users',
        expect.any(Number),
      );
    });
  });

  describe('getUserStats', () => {
    it('should return user stats', async () => {
      mockUserRepository.count.mockResolvedValueOnce(100);
      mockUserRepository.count.mockResolvedValueOnce(80);

      const result = await service.getUserStats();

      expect(result).toEqual({
        totalUsers: 100,
        activeUsers: 80,
        inactiveUsers: 20,
      });
    });
  });

  describe('validateUser', () => {
    it('should return user if validation succeeds', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validateUser('test@example.com', 'password123');

      expect(result).toEqual(mockUser);
    });

    it('should return null if user not found', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      const result = await service.validateUser('nonexistent@example.com', 'password123');

      expect(result).toBeNull();
    });

    it('should return null if password is incorrect', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await service.validateUser('test@example.com', 'wrongpassword');

      expect(result).toBeNull();
    });
  });
});
