import { IsArray, IsEmail, IsNotEmpty, IsObject, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class ContactDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsObject()
  @IsOptional()
  personalization?: Record<string, any>;
}

export class AddContactsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ContactDto)
  contacts: ContactDto[];
}

