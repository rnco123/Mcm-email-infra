import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Broadcast, BroadcastStatus } from './entities/broadcast.entity';
import { BroadcastContact, ContactStatus } from './entities/broadcast-contact.entity';
import { CreateBroadcastDto } from './dto/create-broadcast.dto';
import { AddContactsDto } from './dto/add-contacts.dto';
import { TenantService } from '../tenant/tenant.service';
import { SqsService } from '../sqs/sqs.service';
import { EncryptionService } from '../common/services/encryption.service';
import { AuditLogService } from '../common/services/audit-log.service';
import { AuditResource } from '../common/entities/audit-log.entity';

@Injectable()
export class BroadcastService {
  private readonly logger = new Logger(BroadcastService.name);

  constructor(
    @InjectRepository(Broadcast)
    private readonly broadcastRepository: Repository<Broadcast>,
    @InjectRepository(BroadcastContact)
    private readonly contactRepository: Repository<BroadcastContact>,
    private readonly tenantService: TenantService,
    private readonly sqsService: SqsService,
    private readonly encryptionService: EncryptionService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async create(
    tenantId: string,
    createBroadcastDto: CreateBroadcastDto,
  ): Promise<Broadcast> {
    const tenant = await this.tenantService.findOne(tenantId);
    const domain = createBroadcastDto.from
      ? await this.tenantService.findDomainByTenantAndDomain(
          tenantId,
          createBroadcastDto.from.split('@')[1],
        )
      : await this.tenantService.getDefaultDomain(tenantId);

    if (!domain) {
      throw new BadRequestException('No active domain found for tenant');
    }

    const broadcast = this.broadcastRepository.create({
      ...createBroadcastDto,
      tenantId,
      domainId: domain.id,
      from: createBroadcastDto.from || `noreply@${domain.domain}`,
      status: BroadcastStatus.DRAFT,
    });

    const savedBroadcast = await this.broadcastRepository.save(broadcast);

    // Log PHI creation for HIPAA compliance
    await this.auditLogService.logPhiCreation(tenantId, AuditResource.BROADCAST, savedBroadcast.id, {
      metadata: { name: createBroadcastDto.name },
    });

    return savedBroadcast;
  }

  async addContacts(
    tenantId: string,
    broadcastId: string,
    addContactsDto: AddContactsDto,
  ): Promise<void> {
    const broadcast = await this.broadcastRepository.findOne({
      where: { id: broadcastId, tenantId },
    });

    if (!broadcast) {
      throw new NotFoundException(`Broadcast with ID ${broadcastId} not found`);
    }

    if (broadcast.status !== BroadcastStatus.DRAFT) {
      throw new BadRequestException('Can only add contacts to draft broadcasts');
    }

    // Encrypt PHI before saving
    const contacts = addContactsDto.contacts.map((contact) => {
      const encryptedEmail = this.encryptionService.encrypt(contact.email);
      // Store personalization as encrypted JSON string in a text field
      // Note: We'll need to update the entity to store this as text instead of jsonb
      const encryptedPersonalization = contact.personalization
        ? this.encryptionService.encrypt(JSON.stringify(contact.personalization))
        : null;

      return this.contactRepository.create({
        broadcastId: broadcast.id,
        email: encryptedEmail,
        personalization: encryptedPersonalization ? { encrypted: encryptedPersonalization } : null,
        status: ContactStatus.PENDING,
      });
    });

    await this.contactRepository.save(contacts);

    // Log PHI creation for HIPAA compliance
    await this.auditLogService.logPhiCreation(tenantId, AuditResource.BROADCAST_CONTACT, broadcast.id, {
      metadata: { contactCount: contacts.length },
    });

    broadcast.totalContacts = await this.contactRepository.count({
      where: { broadcastId: broadcast.id },
    });
    await this.broadcastRepository.save(broadcast);
  }

  async start(tenantId: string, broadcastId: string): Promise<Broadcast> {
    const broadcast = await this.broadcastRepository.findOne({
      where: { id: broadcastId, tenantId },
      relations: ['contacts'],
    });

    if (!broadcast) {
      throw new NotFoundException(`Broadcast with ID ${broadcastId} not found`);
    }

    if (broadcast.status !== BroadcastStatus.DRAFT) {
      throw new BadRequestException('Only draft broadcasts can be started');
    }

    const contactCount = await this.contactRepository.count({
      where: { broadcastId: broadcast.id },
    });

    if (contactCount === 0) {
      throw new BadRequestException('Cannot start broadcast without contacts');
    }

    broadcast.status = BroadcastStatus.QUEUED;
    broadcast.totalContacts = contactCount;
    await this.broadcastRepository.save(broadcast);

    // Send to SQS for processing
    await this.sqsService.sendBroadcastMessage({
      broadcastId: broadcast.id,
      tenantId: broadcast.tenantId,
      domainId: broadcast.domainId,
    });

    return broadcast;
  }

  async processBroadcast(message: any): Promise<void> {
    const { broadcastId } = message;

    const broadcast = await this.broadcastRepository.findOne({
      where: { id: broadcastId },
      relations: ['contacts'],
    });

    if (!broadcast) {
      this.logger.error(`Broadcast not found: ${broadcastId}`);
      return;
    }

    broadcast.status = BroadcastStatus.PROCESSING;
    await this.broadcastRepository.save(broadcast);

    // Process contacts in batches
    const batchSize = 100;
    let offset = message.offset || 0;

    const contacts = await this.contactRepository.find({
      where: {
        broadcastId,
        status: ContactStatus.PENDING,
      },
      take: batchSize,
      skip: offset,
    });

    if (contacts.length === 0) {
      // All contacts processed
      broadcast.status = BroadcastStatus.COMPLETED;
      await this.broadcastRepository.save(broadcast);
      return;
    }

    // Get domain for Resend API key
    const domain = await this.tenantService.findOne(broadcast.tenantId).then(
      (tenant) =>
        tenant.domains.find((d) => d.id === broadcast.domainId) ||
        tenant.domains[0],
    );

    if (!domain) {
      throw new Error(`Domain not found for broadcast ${broadcastId}`);
    }

    // Send individual emails for each contact
    for (const contact of contacts) {
      try {
        // Decrypt PHI for processing
        const decryptedEmail = this.encryptionService.decrypt(contact.email);
        let decryptedPersonalization = null;
        if (contact.personalization) {
          // Check if it's encrypted format
          if (contact.personalization.encrypted) {
            decryptedPersonalization = JSON.parse(
              this.encryptionService.decrypt(contact.personalization.encrypted)
            );
          } else {
            // Backward compatibility - assume it's already decrypted
            decryptedPersonalization = contact.personalization;
          }
        }

        await this.sqsService.sendEmailMessage({
          emailLogId: null,
          tenantId: broadcast.tenantId,
          domainId: broadcast.domainId,
          resendApiKey: domain.resendApiKey,
          to: decryptedEmail,
          from: broadcast.from,
          subject: broadcast.subject,
          html: this.personalizeContent(broadcast.html, decryptedPersonalization),
          text: this.personalizeContent(broadcast.text, decryptedPersonalization),
          broadcastId: broadcast.id,
          contactId: contact.id,
        });

        contact.status = ContactStatus.SENT;
        broadcast.sentCount += 1;
      } catch (error) {
        // Don't log PHI in error messages
        this.logger.error(
          `Failed to queue email for contact ${contact.id}`,
        );
        contact.status = ContactStatus.FAILED;
        contact.error = { message: 'Email processing failed' }; // Sanitized
        broadcast.failedCount += 1;
      }

      await this.contactRepository.save(contact);
    }

    await this.broadcastRepository.save(broadcast);

    // Continue processing next batch
    if (contacts.length === batchSize) {
      await this.sqsService.sendBroadcastMessage({
        broadcastId,
        tenantId: broadcast.tenantId,
        domainId: broadcast.domainId,
        offset: offset + batchSize,
      });
    } else {
      broadcast.status = BroadcastStatus.COMPLETED;
      await this.broadcastRepository.save(broadcast);
    }
  }

  private personalizeContent(
    content: string | null,
    personalization: Record<string, any> | null,
  ): string | null {
    if (!content || !personalization) {
      return content;
    }

    let personalized = content;
    for (const [key, value] of Object.entries(personalization)) {
      personalized = personalized.replace(
        new RegExp(`{{${key}}}`, 'g'),
        String(value),
      );
    }

    return personalized;
  }

  async findOne(tenantId: string, id: string): Promise<Broadcast> {
    const broadcast = await this.broadcastRepository.findOne({
      where: { id, tenantId },
      relations: ['contacts'],
    });

    if (!broadcast) {
      throw new NotFoundException(`Broadcast with ID ${id} not found`);
    }

    // Decrypt PHI in contacts
    if (broadcast.contacts) {
      broadcast.contacts = broadcast.contacts.map((contact) => {
        const decrypted = { ...contact };
        try {
          decrypted.email = this.encryptionService.decrypt(contact.email);
          if (contact.personalization) {
            if (contact.personalization.encrypted) {
              decrypted.personalization = JSON.parse(
                this.encryptionService.decrypt(contact.personalization.encrypted)
              );
            } else {
              // Backward compatibility
              decrypted.personalization = contact.personalization;
            }
          }
        } catch (error) {
          this.logger.warn(`Failed to decrypt contact ${contact.id}`);
        }
        return decrypted;
      });
    }

    // Log PHI access for HIPAA compliance
    await this.auditLogService.logPhiAccess(tenantId, AuditResource.BROADCAST, id, {});

    return broadcast;
  }

  async getStatus(tenantId: string, id: string) {
    const broadcast = await this.findOne(tenantId, id);
    return {
      id: broadcast.id,
      status: broadcast.status,
      totalContacts: broadcast.totalContacts,
      sentCount: broadcast.sentCount,
      failedCount: broadcast.failedCount,
      progress:
        broadcast.totalContacts > 0
          ? (broadcast.sentCount / broadcast.totalContacts) * 100
          : 0,
    };
  }
}

