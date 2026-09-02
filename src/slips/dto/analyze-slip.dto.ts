import { IsString, IsNotEmpty } from 'class-validator';

export class AnalyzeSlipDto {
  @IsString()
  @IsNotEmpty()
  imageBase64: string;
}
