import {
  IsString,
  IsOptional,
  IsNumber,
  IsArray,
  IsInt,
  Min,
  Max,
  Length,
  IsLatitude,
  IsLongitude,
  ValidateNested,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class GeocodeDto {
  @IsString()
  @Length(1, 500, { message: 'Address must be between 1 and 500 characters' })
  address: string;

  @IsOptional()
  @IsString()
  @Length(2, 2, { message: 'Country code must be exactly 2 characters' })
  countryCode?: string;

  @IsOptional()
  @IsString()
  @Length(2, 10, { message: 'Language code must be between 2 and 10 characters' })
  language?: string;
}

export class ReverseGeocodeDto {
  @IsNumber({}, { message: 'Latitude must be a valid number' })
  @IsLatitude({ message: 'Latitude must be between -90 and 90' })
  @Type(() => Number)
  latitude: number;

  @IsNumber({}, { message: 'Longitude must be a valid number' })
  @IsLongitude({ message: 'Longitude must be between -180 and 180' })
  @Type(() => Number)
  longitude: number;

  @IsOptional()
  @IsString()
  @Length(2, 10, { message: 'Language code must be between 2 and 10 characters' })
  language?: string;
}

export class BatchAddressDto {
  @IsString()
  @Length(1, 500, { message: 'Address must be between 1 and 500 characters' })
  address: string;

  @IsOptional()
  @IsString()
  @Length(2, 2, { message: 'Country code must be exactly 2 characters' })
  countryCode?: string;

  @IsOptional()
  @IsString()
  requestId?: string;
}

export class BatchGeocodeDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BatchAddressDto)
  addresses: BatchAddressDto[];

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  priority?: number;
}

export class ValidateAddressDto {
  @IsString()
  @Length(1, 500, { message: 'Address must be between 1 and 500 characters' })
  address: string;

  @IsOptional()
  @IsString()
  @Length(2, 2, { message: 'Country code must be exactly 2 characters' })
  countryCode?: string;
}

export class FormatAddressDto {
  @IsString()
  address: any; // 可以是字符串或对象

  @IsOptional()
  @IsString()
  @Length(2, 2, { message: 'Country code must be exactly 2 characters' })
  countryCode?: string;
}
