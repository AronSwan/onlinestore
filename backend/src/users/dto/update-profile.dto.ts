import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional, IsString, Length, MaxLength } from 'class-validator';

export enum Gender {
  Unknown = 0,
  Male = 1,
  Female = 2,
}

export class UpdateProfileDto {
  @ApiProperty({ required: false }) @IsOptional() @IsString() @MaxLength(50) username?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() @MaxLength(500) avatar?: string;
  @ApiProperty({ required: false, enum: Gender }) @IsOptional() @IsEnum(Gender) gender?: Gender;
  @ApiProperty({ required: false }) @IsOptional() @IsDateString() birthday?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() @Length(6, 50) newPassword?: string;
}
