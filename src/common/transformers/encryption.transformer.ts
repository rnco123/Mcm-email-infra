import { ValueTransformer } from 'typeorm';
import { EncryptionService } from '../services/encryption.service';

/**
 * Creates a TypeORM transformer for encrypting/decrypting column values
 * Note: This requires the EncryptionService to be available
 * For entity-level encryption, we'll handle it in the service layer
 */
export class EncryptionTransformer implements ValueTransformer {
  constructor(private readonly encryptionService: EncryptionService) {}

  to(value: string | null): string | null {
    if (!value) {
      return value;
    }
    return this.encryptionService.encrypt(value);
  }

  from(value: string | null): string | null {
    if (!value) {
      return value;
    }
    try {
      return this.encryptionService.decrypt(value);
    } catch (error) {
      // If decryption fails, might be plaintext (backward compatibility)
      return value;
    }
  }
}

/**
 * Helper function to create encryption transformer
 * Note: TypeORM transformers are created at entity definition time,
 * so we'll handle encryption in the service layer instead
 */
export function createEncryptionTransformer(
  encryptionService: EncryptionService,
): ValueTransformer {
  return new EncryptionTransformer(encryptionService);
}

