/**
 * 用户模块，基于PrestaShop模块化架构
 * 整合所有用户相关的组件和服务
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CqrsModule } from '@nestjs/cqrs';
import { MonitoringModule } from '../monitoring/monitoring.module';

// Entities
import { UserEntity } from './infrastructure/entities/user.entity';
import { User } from './entities/user.entity';

// Repositories
import { EnhancedUsersRepository } from './infrastructure/repositories/enhanced-users.repository';
import { TypeOrmEnhancedUsersRepository } from './infrastructure/repositories/typeorm-enhanced-users.repository';

// Command Handlers
import { CreateUserHandler } from './application/handlers/create-user.handler';
import { UpdateUserHandler } from './application/handlers/update-user.handler';

// Query Handlers
import { GetUserForEditingHandler } from './application/handlers/get-user-for-editing.handler';
import { SearchUsersHandler } from './application/handlers/search-users.handler';

// Controllers
import { UsersController } from './users.controller';

// Services
import { UsersService } from './users.service';

const CommandHandlers = [CreateUserHandler, UpdateUserHandler];

const QueryHandlers = [GetUserForEditingHandler, SearchUsersHandler];

@Module({
  imports: [TypeOrmModule.forFeature([UserEntity, User]), CqrsModule, MonitoringModule],
  controllers: [UsersController],
  providers: [
    UsersService,
    {
      provide: 'EnhancedUsersRepository',
      useClass: TypeOrmEnhancedUsersRepository,
    },
    ...CommandHandlers,
    ...QueryHandlers,
  ],
  exports: [UsersService, 'EnhancedUsersRepository'],
})
export class UsersModule {}
