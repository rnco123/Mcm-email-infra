import { Injectable } from '@nestjs/common';

/**
 * Service for masking PHI in logs and responses
 * HIPAA requires that PHI is not exposed in logs or error messages
 */
@Injectable()
export class PhiMaskingService {
  /**
   * Masks email addresses for logging
   * example@domain.com -> ex***@domain.com
   */
  maskEmail(email: string): string {
    if (!email || !email.includes('@')) {
      return '***';
    }

    const [local, domain] = email.split('@');
    if (local.length <= 2) {
      return `${local[0]}***@${domain}`;
    }
    return `${local.substring(0, 2)}***@${domain}`;
  }

  /**
   * Masks personalization data
   */
  maskPersonalization(personalization: Record<string, any> | null): Record<string, any> | null {
    if (!personalization) {
      return null;
    }

    const masked: Record<string, any> = {};
    for (const [key, value] of Object.entries(personalization)) {
      if (typeof value === 'string' && value.length > 0) {
        // Mask strings longer than 2 characters
        masked[key] = value.length > 2 
          ? `${value.substring(0, 2)}***` 
          : '***';
      } else {
        masked[key] = '***';
      }
    }
    return masked;
  }

  /**
   * Masks an object containing PHI
   */
  maskPhiObject<T extends Record<string, any>>(
    obj: T,
    phiFields: string[] = ['email', 'to', 'from', 'personalization'],
  ): T {
    const masked: any = { ...obj };
    
    for (const field of phiFields) {
      if (masked[field]) {
        if (field === 'email' || field === 'to' || field === 'from') {
          masked[field] = this.maskEmail(masked[field]);
        } else if (field === 'personalization') {
          masked[field] = this.maskPersonalization(masked[field]);
        } else if (typeof masked[field] === 'string') {
          masked[field] = masked[field].length > 2
            ? `${masked[field].substring(0, 2)}***`
            : '***';
        }
      }
    }
    
    return masked as T;
  }

  /**
   * Sanitizes error messages to remove PHI
   */
  sanitizeErrorMessage(error: Error | string): string {
    const message = typeof error === 'string' ? error : error.message;
    
    // Remove email patterns
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    return message.replace(emailRegex, '[EMAIL_REDACTED]');
  }
}

