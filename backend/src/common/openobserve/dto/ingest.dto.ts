import { IsString, IsOptional, IsEnum, IsNumber, IsInt, IsBoolean, IsIn, IsISO8601, Matches } from 'class-validator';
import { Transform } from 'class-transformer';

export class IngestEmailVerificationDto {
  @IsISO8601()
  @Transform(({ value }) => String(value).trim())
  timestamp!: string; // ISO8601 UTC

  @IsString()
  @Transform(({ value }) => String(value).trim())
  source!: string; // apiserver/worker 等

  @IsString()
  @IsIn(['verify_result', 'verify_error', 'metric'])
  @Transform(({ value }) => String(value).trim())
  kind!: string;

  @IsString()
  @Matches(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)
  @Transform(({ value }) => String(value).trim().toLowerCase())
  email!: string;

  @IsString()
  @Transform(({ value }) => String(value).trim().toLowerCase())
  domain!: string;

  @IsString()
  @IsIn(['yes', 'no', 'unknown'])
  @Transform(({ value }) => String(value).trim().toLowerCase())
  reachable!: 'yes' | 'no' | 'unknown';

  @IsInt()
  @Transform(({ value }) => parseInt(value, 10))
  latency_ms!: number;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => value === undefined ? value : String(value).trim())
  error_code?: string;

  // 标签维度
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value === undefined ? value : String(value).trim())
  env?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => value === undefined ? value : String(value).trim())
  service?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => value === undefined ? value : String(value).trim())
  region?: string;

  // 可选批次ID、请求ID，便于观测与溯源
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value === undefined ? value : String(value).trim())
  batch_id?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => value === undefined ? value : String(value).trim())
  request_id?: string;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === true || value === 'true')
  compression?: boolean;
}