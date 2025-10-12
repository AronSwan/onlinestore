import { IsString, IsArray, IsOptional, IsNumber, Max, Min, IsEnum, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';

export enum TimeRangeEnum {
  LAST_1H = '1h',
  LAST_6H = '6h',
  LAST_24H = '24h',
  LAST_7D = '7d',
  LAST_30D = '30d',
  CUSTOM = 'custom'
}

export enum LogLevelEnum {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  FATAL = 'fatal'
}

export enum SeverityEnum {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export class BaseQueryDto {
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => Array.isArray(value) ? value : value.split(',').map((s: string) => s.trim()))
  streams: string[];

  @IsString()
  @Transform(({ value }) => value?.trim())
  query: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  startTime?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  endTime?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10000)
  @Transform(({ value }) => parseInt(value))
  limit?: number = 1000;
}

export class CorrelationQueryDto extends BaseQueryDto {
  @IsString()
  @Transform(({ value }) => value?.trim())
  primaryStream: string;

  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => Array.isArray(value) ? value : value.split(',').map((s: string) => s.trim()))
  secondaryStreams: string[];

  @IsString()
  @Transform(({ value }) => value?.trim())
  correlationField: string;

  @IsOptional()
  @IsEnum(TimeRangeEnum)
  @Transform(({ value }) => value?.trim().toLowerCase())
  timeRange?: string = '1h';
}

export class StatisticsQueryDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => value ? (Array.isArray(value) ? value : value.split(',').map((s: string) => s.trim())) : undefined)
  streams?: string[];
}

export class IntegrityQueryDto {
  @IsString()
  @Transform(({ value }) => value?.trim())
  stream: string;
}

export class IngestDataDto {
  @IsString()
  @Transform(({ value }) => value?.trim())
  stream: string;

  @IsArray()
  data: any[];

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  compression?: boolean = true;
}

export class CleanupDataDto {
  @IsString()
  @Transform(({ value }) => value?.trim())
  stream: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(365)
  @Transform(({ value }) => parseInt(value))
  retentionDays?: number = 30;
}

export class UserBehaviorAnalyticsDto {
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  userId?: string;

  @IsOptional()
  @IsEnum(TimeRangeEnum)
  @Transform(({ value }) => value?.trim().toLowerCase())
  timeRange?: string = '7d';
}

export class SystemPerformanceAnalyticsDto {
  @IsOptional()
  @IsEnum(TimeRangeEnum)
  @Transform(({ value }) => value?.trim().toLowerCase())
  timeRange?: string = '1h';
}

export class SecurityEventsAnalyticsDto {
  @IsOptional()
  @IsEnum(SeverityEnum)
  @Transform(({ value }) => value?.trim().toLowerCase())
  severity?: string;

  @IsOptional()
  @IsEnum(TimeRangeEnum)
  @Transform(({ value }) => value?.trim().toLowerCase())
  timeRange?: string = '24h';
}

export class BusinessMetricsAnalyticsDto {
  @IsOptional()
  @IsEnum(TimeRangeEnum)
  @Transform(({ value }) => value?.trim().toLowerCase())
  timeRange?: string = '30d';
}