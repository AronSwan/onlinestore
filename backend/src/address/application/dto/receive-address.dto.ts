import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, Length } from 'class-validator';

export class ReceiveAddressSaveCommand {
  @ApiProperty() @IsString() userId!: string;
  @ApiProperty() @IsString() userName!: string;
  @ApiProperty() @IsString() @Length(5, 20) phone!: string;
  @ApiProperty() @IsString() provinceCode!: string;
  @ApiProperty() @IsString() provinceName!: string;
  @ApiProperty() @IsString() cityCode!: string;
  @ApiProperty() @IsString() cityName!: string;
  @ApiProperty() @IsString() districtCode!: string;
  @ApiProperty() @IsString() districtName!: string;
  @ApiProperty() @IsString() @Length(1, 200) detailAddress!: string;
  @ApiProperty({ required: false }) @IsOptional() @IsBoolean() isDefault?: boolean;
}

export class ReceiveAddressUpdateCommand {
  @ApiProperty() @IsString() id!: string;
  @ApiProperty() @IsString() userId!: string;
  @ApiProperty() @IsString() userName!: string;
  @ApiProperty() @IsString() @Length(5, 20) phone!: string;
  @ApiProperty() @IsString() provinceCode!: string;
  @ApiProperty() @IsString() provinceName!: string;
  @ApiProperty() @IsString() cityCode!: string;
  @ApiProperty() @IsString() cityName!: string;
  @ApiProperty() @IsString() districtCode!: string;
  @ApiProperty() @IsString() districtName!: string;
  @ApiProperty() @IsString() @Length(1, 200) detailAddress!: string;
  @ApiProperty({ required: false }) @IsOptional() @IsBoolean() isDefault?: boolean;
}

export class ReceiveAddressRespDTO {
  @ApiProperty() id!: string;
  @ApiProperty() userId!: string;
  @ApiProperty() userName!: string;
  @ApiProperty() phone!: string;
  @ApiProperty() provinceCode!: string;
  @ApiProperty() provinceName!: string;
  @ApiProperty() cityCode!: string;
  @ApiProperty() cityName!: string;
  @ApiProperty() districtCode!: string;
  @ApiProperty() districtName!: string;
  @ApiProperty() detailAddress!: string;
  @ApiProperty() isDefault!: boolean;
}
