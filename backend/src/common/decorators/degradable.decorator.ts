import { SetMetadata, applyDecorators } from '@nestjs/common';
import { ServiceType, DegradationLevel } from '../degradation/degradation.service';

export const DEGRADABLE_KEY = 'degradable';
export const FALLBACK_KEY = 'fallback';

/**
 * 降级配置接口
 */
export interface DegradableOptions {
  serviceType: ServiceType;
  fallbackValue?: any;
  fallbackFunction?: string;
  description?: string;
  priority?: number;
  enabledLevels?: DegradationLevel[];
}

/**
 * 降级装饰器
 * 标记方法可以在系统降级时被禁用或使用备用逻辑
 */
export function Degradable(options: DegradableOptions) {
  return applyDecorators(SetMetadata(DEGRADABLE_KEY, options));
}

/**
 * 回退装饰器
 * 为降级方法提供备用实现
 */
export function Fallback(fallbackFunction: string) {
  return SetMetadata(FALLBACK_KEY, fallbackFunction);
}

/**
 * 核心服务装饰器
 * 标记核心服务，在任何降级级别下都保持可用
 */
export function CoreService() {
  return Degradable({
    serviceType: ServiceType.CORE,
    description: 'Core service - always available',
    enabledLevels: [
      DegradationLevel.NORMAL,
      DegradationLevel.LIGHT,
      DegradationLevel.MODERATE,
      DegradationLevel.HEAVY,
      DegradationLevel.EMERGENCY,
    ],
  });
}

/**
 * 增强服务装饰器
 * 标记增强服务，在重度降级时被禁用
 */
export function EnhancementService() {
  return Degradable({
    serviceType: ServiceType.ENHANCEMENT,
    description: 'Enhancement service - disabled during heavy degradation',
    enabledLevels: [DegradationLevel.NORMAL, DegradationLevel.LIGHT, DegradationLevel.MODERATE],
  });
}

/**
 * 分析服务装饰器
 * 标记分析服务，在轻度降级时被禁用
 */
export function AnalyticsService() {
  return Degradable({
    serviceType: ServiceType.ANALYTICS,
    description: 'Analytics service - disabled during light degradation',
    enabledLevels: [DegradationLevel.NORMAL],
  });
}

/**
 * 推荐服务装饰器
 * 标记推荐服务，在轻度降级时使用缓存
 */
export function RecommendationService(fallbackValue: any = []) {
  return Degradable({
    serviceType: ServiceType.RECOMMENDATION,
    fallbackValue,
    description: 'Recommendation service - uses cache during degradation',
    enabledLevels: [DegradationLevel.NORMAL],
  });
}

/**
 * 搜索服务装饰器
 * 标记搜索服务，在中度降级时简化功能
 */
export function SearchService() {
  return Degradable({
    serviceType: ServiceType.SEARCH,
    description: 'Search service - simplified during moderate degradation',
    enabledLevels: [DegradationLevel.NORMAL, DegradationLevel.LIGHT],
  });
}

/**
 * 通知服务装饰器
 * 标记通知服务，在中度降级时批量处理
 */
export function NotificationService() {
  return Degradable({
    serviceType: ServiceType.NOTIFICATION,
    description: 'Notification service - batched during moderate degradation',
    enabledLevels: [DegradationLevel.NORMAL, DegradationLevel.LIGHT],
  });
}
