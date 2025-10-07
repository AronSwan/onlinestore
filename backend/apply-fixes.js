#!/usr/bin/env node

/**
 * 快速修复脚本 - 一键应用所有P0/P1级别问题修复
 * 使用方法: node apply-fixes.js
 */

const fs = require('fs');
const path = require('path');

console.log('🚀 开始应用测试修复...\n');

// 修复统计
const fixStats = {
  total: 0,
  applied: 0,
  failed: 0,
  details: []
};

// 修复1: 监控服务定时器泄漏问题
function fixMonitoringService() {
  const filePath = path.join(__dirname, 'src/monitoring/monitoring.service.spec.ts');
  
  try {
    console.log('📝 修复监控服务定时器泄漏问题...');
    
    // 检查文件是否已修复
    const content = fs.readFileSync(filePath, 'utf8');
    
    if (content.includes('jest.useFakeTimers()')) {
      console.log('✅ 监控服务已修复，跳过');
      return true;
    }
    
    // 应用修复
    const fixedContent = content
      .replace(
        'beforeEach(async () => {',
        'beforeEach(async () => {\n    // 使用假定时器\n    jest.useFakeTimers();'
      )
      .replace(
        'describe(\'MonitoringService\', () => {',
        'describe(\'MonitoringService\', () => {\n  \n  afterEach(() => {\n    // 清理所有定时器\n    jest.clearAllTimers();\n    jest.useRealTimers();\n  });'
      );
    
    fs.writeFileSync(filePath, fixedContent);
    console.log('✅ 监控服务修复完成');
    return true;
  } catch (error) {
    console.error('❌ 监控服务修复失败:', error.message);
    return false;
  }
}

// 修复2: 支付服务事务处理问题
function fixPaymentService() {
  const filePath = path.join(__dirname, 'src/payment/payment.service.spec.ts');
  
  try {
    console.log('📝 修复支付服务事务处理问题...');
    
    // 检查文件是否已修复
    const content = fs.readFileSync(filePath, 'utf8');
    
    if (content.includes('createMockQueryRunner')) {
      console.log('✅ 支付服务已修复，跳过');
      return true;
    }
    
    // 应用修复
    const fixedContent = content
      .replace(
        'const mockQueryRunner = {',
        '// 创建完整的QueryRunner Mock\n  const createMockQueryRunner = () => ({'
      )
      .replace(
        '  } as unknown as QueryRunner;',
        '  }) as unknown as QueryRunner;'
      )
      .replace(
        '  // 在beforeEach中创建新的QueryRunner实例\n  let mockQueryRunner: QueryRunner;',
        '  // 在beforeEach中创建新的QueryRunner实例\n  let mockQueryRunner: QueryRunner;'
      )
      .replace(
        '  beforeEach(async () => {',
        '  beforeEach(async () => {\n    // 创建新的QueryRunner实例\n    mockQueryRunner = createMockQueryRunner();'
      );
    
    fs.writeFileSync(filePath, fixedContent);
    console.log('✅ 支付服务修复完成');
    return true;
  } catch (error) {
    console.error('❌ 支付服务修复失败:', error.message);
    return false;
  }
}

// 修复3: 缓存服务断言问题
function fixCacheService() {
  const filePath = path.join(__dirname, 'src/cache/enhanced-cache.spec.ts');
  
  try {
    console.log('📝 修复缓存服务断言问题...');
    
    // 检查文件是否已修复
    const content = fs.readFileSync(filePath, 'utf8');
    
    if (content.includes('expect(cacheService.get).toHaveBeenCalledWith(\'enhanced\', key)')) {
      console.log('✅ 缓存服务已修复，跳过');
      return true;
    }
    
    // 应用修复
    const fixedContent = content
      .replace(
        'expect(cacheService.get).toHaveBeenCalledWith(\'enhanced:\' + key);',
        'expect(cacheService.get).toHaveBeenCalledWith(\'enhanced\', key);'
      )
      .replace(
        'expect(cacheService.set).toHaveBeenCalledWith(\n        \'enhanced:\' + key,',
        'expect(cacheService.set).toHaveBeenCalledWith(\n        \'enhanced\', key,'
      );
    
    fs.writeFileSync(filePath, fixedContent);
    console.log('✅ 缓存服务修复完成');
    return true;
  } catch (error) {
    console.error('❌ 缓存服务修复失败:', error.message);
    return false;
  }
}

// 修复4: 通知服务Mock问题
function fixNotificationService() {
  const filePath = path.join(__dirname, 'src/notification/notification.service.spec.ts');
  
  try {
    console.log('📝 修复通知服务Mock问题...');
    
    // 检查文件是否已存在
    if (fs.existsSync(filePath)) {
      console.log('✅ 通知服务测试文件已存在，跳过');
      return true;
    }
    
    // 创建通知服务测试文件
    const testContent = `import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationService } from './notification.service';
import { Notification, NotificationType, NotificationStatus } from './entities/notification.entity';
import { EmailService } from './services/email.service';
import { SmsService } from './services/sms.service';
import { PushService } from './services/push.service';

describe('NotificationService', () => {
  let service: NotificationService;
  let notificationRepository: Repository<Notification>;
  let emailService: EmailService;
  let smsService: SmsService;
  let pushService: PushService;

  // Mock repositories
  const mockNotificationRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    findAndCount: jest.fn(),
    update: jest.fn(),
  };

  // Mock services
  const mockEmailService = {
    sendEmail: jest.fn().mockResolvedValue({ messageId: 'email-id-123', success: true }),
  };

  const mockSmsService = {
    sendSms: jest.fn().mockResolvedValue({ messageId: 'sms-id-123', success: true }),
  };

  const mockPushService = {
    sendPush: jest.fn().mockResolvedValue({ messageId: 'push-id-123', success: true }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        {
          provide: getRepositoryToken(Notification),
          useValue: mockNotificationRepository,
        },
        {
          provide: EmailService,
          useValue: mockEmailService,
        },
        {
          provide: SmsService,
          useValue: mockSmsService,
        },
        {
          provide: PushService,
          useValue: mockPushService,
        },
      ],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
    notificationRepository = module.get<Repository<Notification>>(getRepositoryToken(Notification));
    emailService = module.get<EmailService>(EmailService);
    smsService = module.get<SmsService>(SmsService);
    pushService = module.get<PushService>(PushService);

    // 重置所有 mock
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendNotification', () => {
    it('should send email notification immediately', async () => {
      const userId = 1;
      const type = NotificationType.EMAIL;
      const title = 'Test Email';
      const content = 'Test content';
      const metadata = { email: 'test@example.com' };

      const expectedNotification = {
        id: 1,
        userId,
        type,
        title,
        content,
        metadata,
        status: NotificationStatus.SENT,
        sentAt: expect.any(Date),
      };

      mockNotificationRepository.create.mockReturnValue(expectedNotification);
      mockNotificationRepository.save.mockResolvedValue(expectedNotification);

      const result = await service.sendNotification(userId, type, title, content, metadata);

      expect(mockNotificationRepository.create).toHaveBeenCalledWith({
        userId,
        type,
        title,
        content,
        metadata,
        scheduledAt: undefined,
      });
      expect(mockNotificationRepository.save).toHaveBeenCalledTimes(2); // 一次创建，一次更新状态
      expect(mockEmailService.sendEmail).toHaveBeenCalledWith(
        metadata.email,
        title,
        content,
      );
      expect(result).toEqual(expectedNotification);
    });
  });
});
`;
    
    fs.writeFileSync(filePath, testContent);
    console.log('✅ 通知服务测试文件创建完成');
    return true;
  } catch (error) {
    console.error('❌ 通知服务修复失败:', error.message);
    return false;
  }
}

// 修复5: 地址服务依赖注入问题
function fixAddressService() {
  const filePath = path.join(__dirname, 'src/address/address.spec.ts');
  
  try {
    console.log('📝 修复地址服务依赖注入问题...');
    
    // 检查文件是否已修复
    const content = fs.readFileSync(filePath, 'utf8');
    
    if (content.includes('AddressCacheService')) {
      console.log('✅ 地址服务已修复，跳过');
      return true;
    }
    
    // 应用修复
    const fixedContent = content
      .replace(
        'import { AddressFormattingService } from \'./services/address-formatting.service\';',
        'import { AddressFormattingService } from \'./services/address-formatting.service\';\nimport { AddressCacheService } from \'./services/address-cache.service\';'
      )
      .replace(
        'const mockConfigService = {',
        '// Mock AddressCacheService\n  const mockAddressCacheService = {\n    get: jest.fn(),\n    set: jest.fn(),\n    getGeocodeCache: jest.fn(),\n    cacheGeocodeResult: jest.fn(),\n    getReverseCache: jest.fn(),\n    cacheReverseResult: jest.fn(),\n    cacheFailedResult: jest.fn(),\n    cleanupExpiredCache: jest.fn(),\n    getStats: jest.fn(),\n    clear: jest.fn(),\n    getCacheStats: jest.fn(),\n  };\n\n  const mockConfigService = {'
      )
      .replace(
        'AddressFormattingService,',
        'AddressFormattingService,\n        {\n          provide: AddressCacheService,\n          useValue: mockAddressCacheService,\n        },'
      );
    
    fs.writeFileSync(filePath, fixedContent);
    console.log('✅ 地址服务修复完成');
    return true;
  } catch (error) {
    console.error('❌ 地址服务修复失败:', error.message);
    return false;
  }
}

// 执行所有修复
function applyAllFixes() {
  const fixes = [
    { name: '监控服务定时器泄漏', func: fixMonitoringService },
    { name: '支付服务事务处理', func: fixPaymentService },
    { name: '缓存服务断言', func: fixCacheService },
    { name: '通知服务Mock', func: fixNotificationService },
    { name: '地址服务依赖注入', func: fixAddressService }
  ];
  
  fixes.forEach(fix => {
    fixStats.total++;
    if (fix.func()) {
      fixStats.applied++;
      fixStats.details.push(`✅ ${fix.name}`);
    } else {
      fixStats.failed++;
      fixStats.details.push(`❌ ${fix.name}`);
    }
  });
}

// 显示修复结果
function showResults() {
  console.log('\n📊 修复结果统计:');
  console.log(`总计: ${fixStats.total}`);
  console.log(`成功: ${fixStats.applied}`);
  console.log(`失败: ${fixStats.failed}`);
  
  console.log('\n📋 详细结果:');
  fixStats.details.forEach(detail => console.log(detail));
  
  if (fixStats.applied > 0) {
    console.log('\n🎉 修复应用成功！现在可以运行测试验证效果:');
    console.log('npm test -- --testPathPattern="monitoring|payment|cache|notification|address" --verbose');
  }
  
  if (fixStats.failed > 0) {
    console.log('\n⚠️ 部分修复失败，请手动检查相关文件');
  }
}

// 主函数
function main() {
  console.log('🔧 测试问题快速修复脚本');
  console.log('=====================================\n');
  
  applyAllFixes();
  showResults();
}

// 执行脚本
if (require.main === module) {
  main();
}

module.exports = {
  fixMonitoringService,
  fixPaymentService,
  fixCacheService,
  fixNotificationService,
  fixAddressService,
  applyAllFixes
};