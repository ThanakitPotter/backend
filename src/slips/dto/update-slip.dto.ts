import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUrl,
  Min,
} from 'class-validator';

export class UpdateSlipDto {
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  income_amount?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  tax_deducted?: number;

  @IsOptional()
  @IsDateString()
  received_date?: string;

  @IsOptional()
  @IsString()
  @IsUrl()
  slip_image_url?: string;
}
