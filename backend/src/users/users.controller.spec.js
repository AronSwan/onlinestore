"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const users_controller_1 = require("./users.controller");
const users_service_1 = require("./users.service");
const common_1 = require("@nestjs/common");
const user_entity_1 = require("./entities/user.entity");
const user_deletion_service_1 = require("./user-deletion.service");
describe('UsersController', () => {
    let controller;
    let usersService;
    let userDeletion;
    const createMockUser = (overrides = {}) => ({
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        password: 'hashedPassword',
        role: user_entity_1.UserRole.USER,
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
    });
    const expectedResponse = (user) => ({
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
        userDeletion = {
            deleteMeCascade: jest.fn(),
        };
        const module = await testing_1.Test.createTestingModule({
            controllers: [users_controller_1.UsersController],
            providers: [
                {
                    provide: users_service_1.UsersService,
                    useValue: usersService,
                },
                {
                    provide: user_deletion_service_1.UserDeletionService,
                    useValue: userDeletion,
                },
            ],
        }).compile();
        controller = module.get(users_controller_1.UsersController);
        jest.clearAllMocks();
    });
    describe('POST /users', () => {
        const createUserDto = {
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
            usersService.create.mockRejectedValue(new common_1.ConflictException('邮箱已被注册'));
            await expect(controller.createUser(createUserDto)).rejects.toThrow(common_1.ConflictException);
        });
        it('should handle database connection errors', async () => {
            usersService.create.mockRejectedValue(new Error('Database connection failed'));
            await expect(controller.createUser(createUserDto)).rejects.toThrow('Database connection failed');
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
            usersService.findOne.mockRejectedValue(new common_1.NotFoundException('用户不存在'));
            await expect(controller.getUserById('999')).rejects.toThrow(common_1.NotFoundException);
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
            const updateUserDto = {
                email: 'updated@example.com',
            };
            const updatedUser = createMockUser({ email: 'updated@example.com' });
            usersService.update.mockResolvedValue(updatedUser);
            const result = await controller.updateUser('1', updateUserDto);
            expect(result).toEqual(expectedResponse(updatedUser));
            expect(usersService.update).toHaveBeenCalledWith(1, updateUserDto);
        });
        it('should throw error for non-existent user', async () => {
            const updateDto = { email: 'updated@example.com' };
            usersService.update.mockRejectedValue(new common_1.NotFoundException('用户不存在'));
            await expect(controller.updateUser('999', updateDto)).rejects.toBeInstanceOf(common_1.NotFoundException);
        });
        it('should handle database connection errors during update', async () => {
            const updateDto = { email: 'updated@example.com' };
            usersService.update.mockRejectedValue(new Error('Database connection failed'));
            await expect(controller.updateUser('1', updateDto)).rejects.toThrow('Database connection failed');
        });
    });
    describe('DELETE /users/:id', () => {
        it('should throw NotImplementedException (501) while delete is not implemented', async () => {
            await expect(controller.deleteUser('1')).rejects.toThrow(common_1.NotImplementedException);
            await expect(controller.deleteUser('1')).rejects.toThrow('用户删除功能未实现');
        });
        it('should throw NotImplementedException regardless of user existence', async () => {
            await expect(controller.deleteUser('999')).rejects.toThrow(common_1.NotImplementedException);
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
            const updateDto = {
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
            await expect(controller.createUser({
                username: 'test',
                email: 'test@example.com',
                password: 'Password123!',
            })).rejects.toThrow('Rate limit exceeded');
        });
    });
    describe('DELETE /users/me', () => {
        it('应按令牌 sub 委托级联注销并返回确认', async () => {
            const result = await controller.deleteMe({ user: { sub: 42, email: 'a@b.c', role: 'user' } });
            expect(userDeletion.deleteMeCascade).toHaveBeenCalledWith(42);
            expect(result).toEqual({ message: '账号已注销' });
        });
        it('用户不存在时应透传 NotFoundException（404）', async () => {
            userDeletion.deleteMeCascade.mockRejectedValueOnce(new common_1.NotFoundException('用户不存在'));
            await expect(controller.deleteMe({ user: { sub: 999 } })).rejects.toBeInstanceOf(common_1.NotFoundException);
        });
        it('sub 非法（NaN）也应原样送服务层（由服务层 404 兜底）', async () => {
            await controller.deleteMe({ user: {} });
            expect(userDeletion.deleteMeCascade).toHaveBeenCalledWith(NaN);
        });
    });
});
