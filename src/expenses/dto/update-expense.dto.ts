import { IsNumber, IsString, IsOptional, IsDateString } from 'class-validator';

export class UpdateExpenseDto {
  @IsNumber()
  @IsOptional()
  amount?: number;

  @IsNumber()
  @IsOptional()
  vat_amount?: number;

  @IsString()
  @IsOptional()
  merchant_name?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsDateString()
  @IsOptional()
  receipt_date?: string;

  @IsString()
  @IsOptional()
  receipt_image_url?: string;
}
