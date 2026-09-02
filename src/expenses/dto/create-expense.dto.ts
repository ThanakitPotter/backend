import { IsNumber, IsString, IsOptional, IsDateString } from 'class-validator';

export class CreateExpenseDto {
  @IsNumber()
  amount: number;

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
  receipt_date: string;

  @IsString()
  receipt_image_url: string;
}
