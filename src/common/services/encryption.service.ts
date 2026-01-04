import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

/**
 * HIPAA-compliant encryption service for PHI
 * Uses AES-256-GCM for authenticated encryption
 */
@Injectable()
export class EncryptionService {
  private readonly logger = new Logger(EncryptionService.name);
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyLength = 32; // 256 bits
  private readonly ivLength = 16; // 128 bits
  private readonly saltLength = 64;
  private readonly tagLength = 16;
  private readonly encryptionKey: Buffer;

  constructor(private readonly configService: ConfigService) {
    const key = this.configService.get<string>('ENCRYPTION_KEY');
    if (!key) {
      throw new Error('ENCRYPTION_KEY environment variable is required for HIPAA compliance');
    }

    // Derive a 256-bit key from the provided key using PBKDF2
    this.encryptionKey = crypto.pbkdf2Sync(
      key,
      'hipaa-salt',
      100000, // iterations
      this.keyLength,
      'sha256',
    );
  }

  /**
   * Encrypts sensitive data (PHI)
   * Returns base64-encoded string: iv:salt:tag:encryptedData
   */
  encrypt(plaintext: string): string {
    if (!plaintext) {
      return plaintext;
    }

    try {
      const iv = crypto.randomBytes(this.ivLength);
      const salt = crypto.randomBytes(this.saltLength);
      
      // Derive key from master key and salt
      const key = crypto.pbkdf2Sync(
        this.encryptionKey,
        salt,
        100000,
        this.keyLength,
        'sha256',
      );

      const cipher = crypto.createCipheriv(this.algorithm, key, iv);
      
      let encrypted = cipher.update(plaintext, 'utf8', 'base64');
      encrypted += cipher.final('base64');
      
      const tag = cipher.getAuthTag();
      
      // Return: iv:salt:tag:encryptedData
      return `${iv.toString('base64')}:${salt.toString('base64')}:${tag.toString('base64')}:${encrypted}`;
    } catch (error) {
      this.logger.error('Encryption failed', error);
      throw new Error('Failed to encrypt sensitive data');
    }
  }

  /**
   * Decrypts sensitive data (PHI)
   */
  decrypt(encryptedData: string): string {
    if (!encryptedData || !encryptedData.includes(':')) {
      return encryptedData; // Not encrypted or empty
    }

    try {
      const parts = encryptedData.split(':');
      if (parts.length !== 4) {
        throw new Error('Invalid encrypted data format');
      }

      const [ivBase64, saltBase64, tagBase64, encrypted] = parts;
      
      const iv = Buffer.from(ivBase64, 'base64');
      const salt = Buffer.from(saltBase64, 'base64');
      const tag = Buffer.from(tagBase64, 'base64');

      // Derive key from master key and salt
      const key = crypto.pbkdf2Sync(
        this.encryptionKey,
        salt,
        100000,
        this.keyLength,
        'sha256',
      );

      const decipher = crypto.createDecipheriv(this.algorithm, key, iv);
      decipher.setAuthTag(tag);

      let decrypted = decipher.update(encrypted, 'base64', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      this.logger.error('Decryption failed', error);
      throw new Error('Failed to decrypt sensitive data');
    }
  }

  /**
   * Encrypts an object's sensitive fields
   */
  encryptObject<T extends Record<string, any>>(
    obj: T,
    sensitiveFields: string[],
  ): T {
    const encrypted = { ...obj };
    for (const field of sensitiveFields) {
      if (encrypted[field] && typeof encrypted[field] === 'string') {
        encrypted[field] = this.encrypt(encrypted[field]);
      } else if (encrypted[field] && typeof encrypted[field] === 'object') {
        // Encrypt JSON fields
        encrypted[field] = this.encrypt(JSON.stringify(encrypted[field]));
      }
    }
    return encrypted;
  }

  /**
   * Decrypts an object's sensitive fields
   */
  decryptObject<T extends Record<string, any>>(
    obj: T,
    sensitiveFields: string[],
  ): T {
    const decrypted = { ...obj };
    for (const field of sensitiveFields) {
      if (decrypted[field] && typeof decrypted[field] === 'string') {
        try {
          decrypted[field] = this.decrypt(decrypted[field]);
        } catch (error) {
          // If decryption fails, might not be encrypted (backward compatibility)
          this.logger.warn(`Failed to decrypt field ${field}, assuming plaintext`);
        }
      }
    }
    return decrypted;
  }
}

