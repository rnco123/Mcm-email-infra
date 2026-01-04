import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant } from './entities/tenant.entity';
import { Domain } from './entities/domain.entity';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { CreateDomainDto } from './dto/create-domain.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class TenantService {
  constructor(
    @InjectRepository(Tenant)
    private readonly tenantRepository: Repository<Tenant>,
    @InjectRepository(Domain)
    private readonly domainRepository: Repository<Domain>,
  ) {}

  async create(createTenantDto: CreateTenantDto): Promise<Tenant> {
    const tenant = this.tenantRepository.create({
      ...createTenantDto,
      apiKey: uuidv4(),
      isActive: createTenantDto.isActive ?? true,
    });
    return this.tenantRepository.save(tenant);
  }

  async findOne(id: string): Promise<Tenant> {
    const tenant = await this.tenantRepository.findOne({
      where: { id },
      relations: ['domains'],
    });
    if (!tenant) {
      throw new NotFoundException(`Tenant with ID ${id} not found`);
    }
    return tenant;
  }

  async findByApiKey(apiKey: string): Promise<Tenant | null> {
    return this.tenantRepository.findOne({
      where: { apiKey, isActive: true },
      relations: ['domains'],
    });
  }

  async createDomain(
    tenantId: string,
    createDomainDto: CreateDomainDto,
  ): Promise<Domain> {
    const tenant = await this.findOne(tenantId);
    const domain = this.domainRepository.create({
      ...createDomainDto,
      tenantId: tenant.id,
      isActive: createDomainDto.isActive ?? true,
    });
    return this.domainRepository.save(domain);
  }

  async findDomainByTenantAndDomain(
    tenantId: string,
    domain: string,
  ): Promise<Domain | null> {
    return this.domainRepository.findOne({
      where: { tenantId, domain, isActive: true },
      relations: ['tenant'],
    });
  }

  async getDefaultDomain(tenantId: string): Promise<Domain | null> {
    return this.domainRepository.findOne({
      where: { tenantId, isActive: true },
      relations: ['tenant'],
    });
  }
}

