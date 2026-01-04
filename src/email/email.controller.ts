import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  UseInterceptors,
} from '@nestjs/common';
import { EmailService } from './email.service';
import { SendEmailDto } from './dto/send-email.dto';
import { TenantInterceptor } from '../common/interceptors/tenant.interceptor';
import { TenantId } from '../common/decorators/tenant.decorator';

@Controller('email')
@UseInterceptors(TenantInterceptor)
export class EmailController {
  constructor(private readonly emailService: EmailService) {}

  @Post('send')
  async sendEmail(
    @TenantId() tenantId: string,
    @Body() sendEmailDto: SendEmailDto,
  ) {
    return this.emailService.sendEmail(tenantId, sendEmailDto);
  }

  @Get(':id')
  async findOne(
    @TenantId() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.emailService.findOne(tenantId, id);
  }
}

