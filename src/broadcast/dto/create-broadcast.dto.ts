import {
  IsString,
  IsNotEmpty,
  IsOptional,
  ValidateIf,
  IsArray,
  IsEmail,
} from 'class-validator';

export class CreateBroadcastDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  subject: string;

  @IsString()
  @IsOptional()
  @ValidateIf((o) => !o.text)
  html?: string;

  @IsString()
  @IsOptional()
  @ValidateIf((o) => !o.html)
  text?: string;

  @IsString()
  @IsOptional()
  from?: string;

  @IsOptional()
  metadata?: Record<string, any>;
}

