// 用途：CQRS模块使用示例
// 作者：后端开发团队
// 时间：2025-10-05

import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { CommandBus } from '../bus/command.bus';
import { QueryBus } from '../bus/query.bus';
import { EventBus } from '../bus/event.bus';
import { CreateUserCommand } from './create-user.command';
import { GetUserQuery } from './get-user.query';
import { UserCreatedEvent } from './user-created.event';
import { TanStackQueryIntegrationService } from '../tanstack-query.integration';

/**
 * 用户控制器示例
 */
@Controller('users')
export class UserController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    private readonly eventBus: EventBus,
    private readonly tanStackClient: TanStackQueryIntegrationService,
  ) {}

  /**
   * 创建用户
   */
  @Post()
  async createUser(@Body() userData: any) {
    const command = new CreateUserCommand({
      username: userData.username,
      email: userData.email,
      password: userData.password,
      firstName: userData.firstName,
      lastName: userData.lastName,
      roleIds: userData.roleIds || [],
    });

    return await this.commandBus.execute(command);
  }

  /**
   * 获取用户
   */
  @Get(':id')
  async getUser(@Param('id') id: string) {
    const query = new GetUserQuery({
      userId: id,
      includeRoles: true,
      includePermissions: false,
    });

    // 使用查询总线执行查询
    return await this.queryBus.executeWithCache(query);
  }

  /**
   * 使用TanStack Query风格获取用户
   */
  @Get(':id/tanstack')
  async getUserWithTanStack(@Param('id') id: string) {
    // 使用TanStack Query客户端
    return await this.tanStackClient.query({
      queryKey: ['user', id],
      queryFn: () => this.queryBus.execute(new GetUserQuery({ userId: id })),
      cacheTime: 300, // 5分钟缓存
      staleTime: 60, // 1分钟后数据过期
    });
  }

  /**
   * 预加载用户数据
   */
  @Get(':id/prefetch')
  async prefetchUser(@Param('id') id: string) {
    const query = new GetUserQuery({ userId: id });

    // 预加载查询
    await this.queryBus.prefetch(query);

    return { message: 'User data prefetched' };
  }

  /**
   * 使缓存失效
   */
  @Post(':id/invalidate')
  async invalidateUserCache(@Param('id') id: string) {
    // 使特定用户缓存失效
    await this.queryBus.invalidateCache('GetUserQuery', `user_${id}_withRoles_noPermissions`);

    return { message: 'User cache invalidated' };
  }

  /**
   * 手动发布事件
   */
  @Post(':id/events/created')
  async publishUserCreatedEvent(@Param('id') id: string) {
    const event = new UserCreatedEvent({
      userId: id,
      username: 'test_user',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      roleIds: ['role_1'],
      createdAt: new Date(),
      createdBy: 'admin',
    });

    await this.eventBus.publish(event);

    return { message: 'Event published', eventId: event.id };
  }
}

/**
 * 服务层使用示例
 */
export class UserService {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    private readonly eventBus: EventBus,
  ) {}

  /**
   * 创建用户并处理相关业务逻辑
   */
  async createUserWithBusinessLogic(userData: any): Promise<any> {
    // 1. 创建用户命令
    const command = new CreateUserCommand(userData);

    // 2. 执行命令
    const result = await this.commandBus.execute(command);

    if (result.success) {
      // 3. 如果成功，执行额外的业务逻辑
      await this.sendWelcomeEmail(result.data.userId);

      // 4. 预加载相关数据
      await this.prefetchRelatedData(result.data.userId);
    }

    return result;
  }

  /**
   * 获取用户及其关联数据
   */
  async getUserWithRelatedData(userId: string): Promise<any> {
    // 1. 获取用户基本信息
    const userQuery = new GetUserQuery({
      userId,
      includeRoles: true,
      includePermissions: true,
    });

    const userResult = await this.queryBus.executeWithCache(userQuery);

    if (!userResult.success) {
      return userResult;
    }

    // 2. 并行获取关联数据
    const relatedDataPromises = [
      this.getUserOrders(userId),
      this.getUserPreferences(userId),
      this.getUserActivity(userId),
    ];

    const relatedData = await Promise.allSettled(relatedDataPromises);

    // 3. 合并结果
    return {
      success: true,
      data: {
        user: userResult.data,
        orders: relatedData[0].status === 'fulfilled' ? relatedData[0].value : null,
        preferences: relatedData[1].status === 'fulfilled' ? relatedData[1].value : null,
        activity: relatedData[2].status === 'fulfilled' ? relatedData[2].value : null,
      },
    };
  }

  /**
   * 批量操作示例
   */
  async batchCreateUsers(usersData: any[]): Promise<any[]> {
    // 创建 promises 数组
    const promises = usersData.map(userData => {
      const command = new CreateUserCommand(userData);
      return this.commandBus.execute(command);
    });

    // 并行执行所有命令
    const results = await Promise.allSettled(promises);

    // 返回结果
    return results.map(result =>
      result.status === 'fulfilled' ? result.value : { success: false, error: result.reason },
    );
  }

  /**
   * 发送欢迎邮件（模拟）
   */
  private async sendWelcomeEmail(userId: string): Promise<void> {
    // 这里可以实现发送邮件的逻辑
    console.log(`Sending welcome email to user ${userId}`);
  }

  /**
   * 预加载相关数据（模拟）
   */
  private async prefetchRelatedData(userId: string): Promise<void> {
    // 预加载用户订单
    await this.queryBus.prefetch(new GetUserOrdersQuery(userId));

    // 预加载用户偏好
    await this.queryBus.prefetch(new GetUserPreferencesQuery(userId));
  }

  /**
   * 获取用户订单（模拟）
   */
  private async getUserOrders(userId: string): Promise<any> {
    // 模拟获取用户订单
    return { userId, orders: [] };
  }

  /**
   * 获取用户偏好（模拟）
   */
  private async getUserPreferences(userId: string): Promise<any> {
    // 模拟获取用户偏好
    return { userId, preferences: {} };
  }

  /**
   * 获取用户活动（模拟）
   */
  private async getUserActivity(userId: string): Promise<any> {
    // 模拟获取用户活动
    return { userId, activities: [] };
  }
}

/**
 * 查询示例（这些需要在实际项目中实现）
 */
import { QueryBase } from '../queries/query.base';

class GetUserOrdersQuery extends QueryBase {
  constructor(public readonly userId: string) {
    super();
  }

  protected getData(): Record<string, any> {
    return { userId: this.userId };
  }
}

class GetUserPreferencesQuery extends QueryBase {
  constructor(public readonly userId: string) {
    super();
  }

  protected getData(): Record<string, any> {
    return { userId: this.userId };
  }
}

class GetUserActivityQuery extends QueryBase {
  constructor(public readonly userId: string) {
    super();
  }

  protected getData(): Record<string, any> {
    return { userId: this.userId };
  }
}
