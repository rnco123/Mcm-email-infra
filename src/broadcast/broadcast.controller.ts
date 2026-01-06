import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags, ApiSecurity } from '@nestjs/swagger';
import { BroadcastService } from './broadcast.service';
import { CreateBroadcastDto } from './dto/create-broadcast.dto';
import { AddContactsDto } from './dto/add-contacts.dto';
import { TenantInterceptor } from '../common/interceptors/tenant.interceptor';
import { TenantId } from '../common/decorators/tenant.decorator';

@ApiTags('broadcast')
@ApiSecurity('api-key')
@Controller('broadcast')
@UseInterceptors(TenantInterceptor)
export class BroadcastController {
  constructor(private readonly broadcastService: BroadcastService) {}

  @Post('create')
  async create(
    @TenantId() tenantId: string,
    @Body() createBroadcastDto: CreateBroadcastDto,
  ) {
    return this.broadcastService.create(tenantId, createBroadcastDto);
  }

  @Post(':id/contacts')
  async addContacts(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() addContactsDto: AddContactsDto,
  ) {
    return this.broadcastService.addContacts(tenantId, id, addContactsDto);
  }

  @Post(':id/start')
  async start(
    @TenantId() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.broadcastService.start(tenantId, id);
  }

  @Get(':id')
  async findOne(
    @TenantId() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.broadcastService.findOne(tenantId, id);
  }

  @Get(':id/status')
  async getStatus(
    @TenantId() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.broadcastService.getStatus(tenantId, id);
  }
}

