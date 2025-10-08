import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from 'src/app.controller';
import { AppService } from 'src/app.service';
import { LoggingModule } from './logging/logging.module';
import { createMasterConfiguration } from './config/unified-master.config';

@Module({
  imports: [
    // 配置模块
    ConfigModule.forRoot({
      isGlobal: true,
      load: [createMasterConfiguration],
    }),
    
    // 数据库模块
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const dbType = configService.get('database.type', 'sqlite') as any;
        const database = configService.get('database.database');
        
        // 确保database字段是字符串类型
        const databaseValue = typeof database === 'string' ? database : String(database);
        
        return {
          type: dbType,
          host: configService.get('database.host'),
          port: configService.get('database.port'),
          username: configService.get('database.username'),
          password: configService.get('database.password'),
          database: databaseValue,
          entities: [__dirname + '/**/*.entity{.ts,.js}'],
          synchronize: configService.get('database.synchronize', false),
          logging: configService.get('database.logging', false),
        };
      },
      inject: [ConfigService],
    }),
    
    // 日志模块
    LoggingModule,
    
    // 其他模块可以在这里添加
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
