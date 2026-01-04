import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';

export class CreateDomainDto {
  @IsString()
  @IsNotEmpty()
  domain: string;

  @IsString()
  @IsNotEmpty()
  resendApiKey: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

