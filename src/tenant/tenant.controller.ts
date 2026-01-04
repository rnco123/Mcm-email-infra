import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseInterceptors,
} from '@nestjs/common';
import { TenantService } from './tenant.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { CreateDomainDto } from './dto/create-domain.dto';
import { TenantInterceptor } from '../common/interceptors/tenant.interceptor';
import { TenantId } from '../common/decorators/tenant.decorator';

@Controller('tenant')
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  @Post()
  create(@Body() createTenantDto: CreateTenantDto) {
    return this.tenantService.create(createTenantDto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.tenantService.findOne(id);
  }

  @Post(':id/domain')
  createDomain(
    @Param('id') id: string,
    @Body() createDomainDto: CreateDomainDto,
  ) {
    return this.tenantService.createDomain(id, createDomainDto);
  }
}

