// Users module barrel exports

// TypeORM Infrastructure Entities
export { UserEntity } from './infrastructure/persistence/typeorm/user.entity';
export { AddressEntity } from './infrastructure/persistence/typeorm/address.entity';
export { CustomerProfileEntity } from './infrastructure/persistence/typeorm/customer-profile.entity';

// Enums
export { UserRole } from './infrastructure/persistence/typeorm/user.entity';
export { AddressType } from './infrastructure/persistence/typeorm/address.entity';
export { CustomerLevel } from './infrastructure/persistence/typeorm/customer-profile.entity';

// DTOs
export * from './dto/create-user.dto';
export * from './dto/update-user.dto';
export * from './dto/update-profile.dto';

// Services
export * from './users.service';
export * from './application/services/customer-management.service';
export * from './application/services/user-password.service';
export * from './application/services/user-profile.service';
export * from './application/services/user-query.service';
export * from './application/services/user-registration.service';

// Controllers
export * from './users.controller';
export * from './users.profile.controller';
export * from './interfaces/web/controllers/customer-management.controller';
export * from './interfaces/web/controllers/user.controller';

// Commands & Queries
export * from './application/commands/change-user-password.command';
export * from './application/commands/register-user.command';
export * from './application/commands/update-user-profile.command';
export * from './application/queries/get-user-by-id.query';
export * from './application/queries/get-users.query';

// Domain (selective exports to avoid conflicts)
export { User } from './domain/entities/user.entity';

// Module
export * from './users.module';
