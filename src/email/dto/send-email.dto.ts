import {
  IsString,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  ValidateIf,
} from 'class-validator';

export class SendEmailDto {
  @IsEmail()
  @IsNotEmpty()
  to: string;

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

  @IsString()
  @IsOptional()
  idempotencyKey?: string;

  @IsOptional()
  metadata?: Record<string, any>;
}

