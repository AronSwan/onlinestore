/**
 * 用户模块
 * 整合用户相关的控制器和服务
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MonitoringModule } from '../monitoring/monitoring.module';

// Entities
// 整改（Blocker 1，2026-10-02）：UserEntity（uuid 形态，@Entity('users')）已从连接中
// 摘除，forFeature 不再注册它——注册未在连接中的实体会导致 Repository 解析失败。
import { User } from './entities/user.entity';

// Controllers
import { UsersController } from './users.controller';

// Services
import { UsersService } from './users.service';
import { UserDeletionService } from './user-deletion.service'; // 权益批 B10

@Module({
  imports: [TypeOrmModule.forFeature([User]), MonitoringModule],
  controllers: [UsersController],
  providers: [
    UsersService,
    UserDeletionService, // 权益批 B10：DELETE /users/me 级联注销（被遗忘权）
  ],
  exports: [UsersService],
})
export class UsersModule {}
