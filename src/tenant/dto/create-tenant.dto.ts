import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';

export class CreateTenantDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

