import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import {
  ConflictException,
  NotFoundException,
  NotImplementedException,
} from '@nestjs/common';

import { User, UserRole } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserDeletionService } from './user-deletion.service';

describe('UsersController', () => {
  let controller: UsersController;
  let usersService: {
    create: jest.Mock;
    findOne: jest.Mock;
    update: jest.Mock;
    findAll: jest.Mock;
    getStatistics: jest.Mock;
  };
  let userDeletion: { deleteMeCascade: jest.Mock };

  const createMockUser = (overrides: Partial<User> = {}): User =>
    ({
      id: 1,
      username: 'testuser',
      email: 'test@example.com',
      password: 'hashedPassword',
      role: UserRole.USER,
      isActive: true,
      avatar: '',
      phone: '',
      casdoorId: '',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      lastLoginAt: new Date(),
      loginCount: 0,
      orders: [],
      userRoles: [],
      ...overrides,
    }) as User;

  // 控制器出口形状：实体经 toResponse 映射（无 password）
  const expectedResponse = (user: User) => ({
    id: user.id,
    email: user.email,
    username: user.username,
    role: user.role,
    isActive: user.isActive,
    avatar: user.avatar,
    phone: user.phone,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  });

  beforeEach(async () => {
    usersService = {
      create: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      findAll: jest.fn(),
      getStatistics: jest.fn(),
    };

    // 权益批 B10：UserDeletionService mock（DELETE /users/me 委托目标）
    userDeletion = {
      deleteMeCascade: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: usersService,
        },
        {
          provide: UserDeletionService,
          useValue: userDeletion,
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);

    jest.clearAllMocks();
  });

  describe('POST /users', () => {
    const createUserDto: CreateUserDto = {
      username: 'newuser',
      email: 'new@example.com',
      password: 'Password123!',
    };

    it('should create a new user successfully', async () => {
      const createdUser = createMockUser({ username: 'newuser', email: 'new@example.com' });
      usersService.create.mockResolvedValue(createdUser);

      const result = await controller.createUser(createUserDto);

      expect(result).toEqual(expectedResponse(createdUser));
      expect(result).not.toHaveProperty('password');
      expect(usersService.create).toHaveBeenCalledWith(createUserDto);
    });

    it('should throw error for duplicate email', async () => {
      usersService.create.mockRejectedValue(new ConflictException('邮箱已被注册'));

      await expect(controller.createUser(createUserDto)).rejects.toThrow(ConflictException);
    });

    it('should handle database connection errors', async () => {
      usersService.create.mockRejectedValue(new Error('Database connection failed'));

      await expect(controller.createUser(createUserDto)).rejects.toThrow(
        'Database connection failed',
      );
    });

    it('should handle concurrent user creation', async () => {
      const createdUser = createMockUser();
      usersService.create.mockResolvedValue(createdUser);

      const results = await Promise.all([
        controller.createUser(createUserDto),
        controller.createUser(createUserDto),
      ]);

      expect(results).toHaveLength(2);
      expect(results[0]).toEqual(expectedResponse(createdUser));
      expect(results[1]).toEqual(expectedResponse(createdUser));
    });
  });

  describe('GET /users', () => {
    it('should return array of users', async () => {
      const users = [createMockUser(), createMockUser({ id: 2, email: 'user2@example.com' })];
      usersService.findAll.mockResolvedValue({ users, total: 2 });

      const result = await controller.searchUsers();

      expect(result.users).toEqual(users.map(expectedResponse));
      expect(result.total).toBe(2);
      expect(result.totalPages).toBe(1);
      expect(usersService.findAll).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        search: undefined,
      });
    });

    it('should handle pagination', async () => {
      const users = [createMockUser()];
      usersService.findAll.mockResolvedValue({ users, total: 21 });

      const result = await controller.searchUsers(undefined, 3, 10);

      expect(result.page).toBe(3);
      expect(result.limit).toBe(10);
      expect(result.totalPages).toBe(3);
      expect(usersService.findAll).toHaveBeenCalledWith({ page: 3, limit: 10, search: undefined });
    });

    it('should handle search functionality', async () => {
      const users = [createMockUser()];
      usersService.findAll.mockResolvedValue({ users, total: 1 });

      const result = await controller.searchUsers('test');

      expect(result.users).toEqual(users.map(expectedResponse));
      expect(usersService.findAll).toHaveBeenCalledWith({ page: 1, limit: 10, search: 'test' });
    });

    it('should return empty array when no users found', async () => {
      usersService.findAll.mockResolvedValue({ users: [], total: 0 });

      const result = await controller.searchUsers();

      expect(result.users).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.totalPages).toBe(0);
    });

    it('should handle database connection errors', async () => {
      usersService.findAll.mockRejectedValue(new Error('Database connection failed'));

      await expect(controller.searchUsers()).rejects.toThrow('Database connection failed');
    });
  });

  describe('GET /users/:id', () => {
    it('should return user by id', async () => {
      const user = createMockUser();
      usersService.findOne.mockResolvedValue(user);

      const result = await controller.getUserById('1');

      expect(result).toEqual(expectedResponse(user));
      expect(usersService.findOne).toHaveBeenCalledWith(1);
    });

    it('should throw error for non-existent user', async () => {
      usersService.findOne.mockRejectedValue(new NotFoundException('用户不存在'));

      await expect(controller.getUserById('999')).rejects.toThrow(NotFoundException);
    });

    it('should handle database connection errors', async () => {
      usersService.findOne.mockRejectedValue(new Error('Database connection failed'));

      await expect(controller.getUserById('1')).rejects.toThrow('Database connection failed');
    });

    it('should return inactive users', async () => {
      const user = createMockUser({ isActive: false });
      usersService.findOne.mockResolvedValue(user);

      const result = await controller.getUserById('1');

      expect(result.isActive).toBe(false);
    });
  });

  describe('PUT /users/:id', () => {
    it('should update user successfully', async () => {
      const updateUserDto: UpdateUserDto = {
        email: 'updated@example.com',
      };

      const updatedUser = createMockUser({ email: 'updated@example.com' });
      usersService.update.mockResolvedValue(updatedUser);

      const result = await controller.updateUser('1', updateUserDto);

      expect(result).toEqual(expectedResponse(updatedUser));
      expect(usersService.update).toHaveBeenCalledWith(1, updateUserDto);
    });

    it('should throw error for non-existent user', async () => {
      const updateDto: UpdateUserDto = { email: 'updated@example.com' };
      usersService.update.mockRejectedValue(new NotFoundException('用户不存在'));

      await expect(controller.updateUser('999', updateDto)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('should handle database connection errors during update', async () => {
      const updateDto: UpdateUserDto = { email: 'updated@example.com' };
      usersService.update.mockRejectedValue(new Error('Database connection failed'));

      await expect(controller.updateUser('1', updateDto)).rejects.toThrow(
        'Database connection failed',
      );
    });
  });

  describe('DELETE /users/:id', () => {
    it('should throw NotImplementedException (501) while delete is not implemented', async () => {
      // 整改（B2）：deleteUser 未实现时改抛 NotImplementedException（501），
      // 不再是裸 Error('Not implemented')（会被当未知异常渲染为 500）
      await expect(controller.deleteUser('1')).rejects.toThrow(NotImplementedException);
      await expect(controller.deleteUser('1')).rejects.toThrow('用户删除功能未实现');
    });

    it('should throw NotImplementedException regardless of user existence', async () => {
      // 未实现与目标用户是否存在无关，统一 501
      await expect(controller.deleteUser('999')).rejects.toThrow(NotImplementedException);
    });
  });

  describe('GET /users/stats/overview', () => {
    it('should return user statistics', async () => {
      const stats = { totalUsers: 10, activeUsers: 8, newUsersToday: 2 };
      usersService.getStatistics.mockResolvedValue(stats);

      const result = await controller.getUserStats();

      expect(result).toEqual(stats);
      expect(usersService.getStatistics).toHaveBeenCalled();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle concurrent user updates', async () => {
      const updateDto: UpdateUserDto = {
        email: 'updated@example.com',
      };

      const updatedUser = createMockUser({ email: 'updated@example.com' });
      usersService.update.mockResolvedValue(updatedUser);

      const results = await Promise.all([
        controller.updateUser('1', updateDto),
        controller.updateUser('1', updateDto),
      ]);

      expect(results).toHaveLength(2);
      expect(results[0]).toEqual(expectedResponse(updatedUser));
      expect(results[1]).toEqual(expectedResponse(updatedUser));
    });

    it('should propagate service-level errors', async () => {
      usersService.create.mockRejectedValue(new Error('Rate limit exceeded'));

      await expect(
        controller.createUser({
          username: 'test',
          email: 'test@example.com',
          password: 'Password123!',
        }),
      ).rejects.toThrow('Rate limit exceeded');
    });
  });

  // 权益批 B10（隐私 P1② 被遗忘权）：本人注销端点——委托 UserDeletionService，
  // id 取自令牌 sub（不经 URL，A 删 B 无路径）
  describe('DELETE /users/me', () => {
    it('应按令牌 sub 委托级联注销并返回确认', async () => {
      const result = await controller.deleteMe({ user: { sub: 42, email: 'a@b.c', role: 'user' } });
      expect(userDeletion.deleteMeCascade).toHaveBeenCalledWith(42);
      expect(result).toEqual({ message: '账号已注销' });
    });

    it('用户不存在时应透传 NotFoundException（404）', async () => {
      userDeletion.deleteMeCascade.mockRejectedValueOnce(new NotFoundException('用户不存在'));
      await expect(controller.deleteMe({ user: { sub: 999 } })).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('sub 非法（NaN）也应原样送服务层（由服务层 404 兜底）', async () => {
      await controller.deleteMe({ user: {} });
      expect(userDeletion.deleteMeCascade).toHaveBeenCalledWith(NaN);
    });
  });
});
