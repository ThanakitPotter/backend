import {
  IsDateString,
  IsNumber,
  IsPositive,
  IsString,
  IsUrl,
  Min,
} from 'class-validator';

export class CreateSlipDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  income_amount: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  tax_deducted: number;

  @IsDateString()
  received_date: string;

  @IsString()
  @IsUrl()
  slip_image_url: string;
}
