# HIPAA Compliance Implementation

This document outlines the HIPAA compliance features implemented in the Email Infrastructure API.

## Overview

The application has been enhanced with comprehensive HIPAA compliance features to protect Protected Health Information (PHI) in accordance with HIPAA regulations.

## Key Features

### 1. Encryption at Rest

- **AES-256-GCM Encryption**: All PHI is encrypted using AES-256-GCM authenticated encryption
- **Encrypted Fields**:
  - Email addresses (`to`, `from`, `email`)
  - Email content (`html`, `text`)
  - Personalization data
- **Key Management**: Encryption keys are derived using PBKDF2 with 100,000 iterations

**Environment Variable Required**:
```bash
ENCRYPTION_KEY=your-secure-encryption-key-here
```

### 2. Audit Logging

All access to PHI is logged for compliance:
- **What**: Action performed (create, read, update, delete, access)
- **Who**: Tenant ID and user identifier
- **When**: Timestamp of access
- **Where**: IP address and user agent
- **Result**: Success or failure (with sanitized error messages)

**Audit Log Entity**: `audit_logs` table stores all access events

### 3. PHI Masking

PHI is automatically masked in:
- **Logs**: Email addresses and personalization data are masked
- **Error Messages**: No PHI is exposed in error responses
- **Audit Metadata**: PHI in audit logs is masked

**Masking Format**:
- Email: `example@domain.com` → `ex***@domain.com`
- Personalization: `John Doe` → `Jo***`

### 4. Secure Error Handling

- Error messages are sanitized to remove PHI
- Stack traces don't expose sensitive data
- Generic error messages returned to clients

### 5. Data Retention

- **Default Retention**: 7 years (2555 days) - configurable
- **Secure Deletion**: Expired PHI is securely deleted
- **Right to be Forgotten**: Individual records can be securely deleted

**Environment Variables**:
```bash
EMAIL_RETENTION_DAYS=2555
CONTACT_RETENTION_DAYS=2555
AUDIT_RETENTION_DAYS=2555
```

### 6. Access Controls

- **Tenant Isolation**: All queries filter by tenant ID
- **API Key Authentication**: Required for all endpoints
- **Authorization**: Tenants can only access their own data

### 7. Database Security

- **SSL/TLS**: Database connections support SSL (configure via `DATABASE_SSL`)
- **Encrypted Storage**: All PHI stored encrypted in database
- **Indexed Queries**: Optimized queries with proper indexing

## Implementation Details

### Encryption Service

Located at: `src/common/services/encryption.service.ts`

- Uses Node.js built-in `crypto` module
- AES-256-GCM with random IV and salt for each encryption
- Format: `iv:salt:tag:encryptedData` (base64 encoded)

### Audit Log Service

Located at: `src/common/services/audit-log.service.ts`

- Automatically logs all PHI access
- Masks PHI in audit metadata
- Stores sanitized error messages

### PHI Masking Service

Located at: `src/common/services/phi-masking.service.ts`

- Masks email addresses
- Masks personalization data
- Sanitizes error messages

### Data Retention Service

Located at: `src/common/services/data-retention.service.ts`

- Handles secure deletion of expired records
- Configurable retention periods
- Supports right to be forgotten requests

## Configuration

### Required Environment Variables

```bash
# Encryption (REQUIRED)
ENCRYPTION_KEY=your-strong-encryption-key-minimum-32-characters

# Data Retention (Optional - defaults to 7 years)
EMAIL_RETENTION_DAYS=2555
CONTACT_RETENTION_DAYS=2555
AUDIT_RETENTION_DAYS=2555

# Database SSL (Optional)
DATABASE_SSL=true
```

### Generating Encryption Key

```bash
# Generate a secure random key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Compliance Checklist

- ✅ PHI encrypted at rest (AES-256-GCM)
- ✅ PHI encrypted in transit (HTTPS/TLS)
- ✅ Comprehensive audit logging
- ✅ PHI masking in logs
- ✅ Secure error handling
- ✅ Access controls and tenant isolation
- ✅ Data retention policies
- ✅ Secure deletion capabilities
- ✅ Right to be forgotten support

## Additional Recommendations

### Production Deployment

1. **Key Management**: Use AWS KMS, HashiCorp Vault, or similar for encryption key management
2. **Database Encryption**: Enable PostgreSQL transparent data encryption (TDE)
3. **Backup Encryption**: Ensure database backups are encrypted
4. **Network Security**: Use VPC, security groups, and network ACLs
5. **Monitoring**: Set up alerts for unauthorized access attempts
6. **Regular Audits**: Review audit logs regularly
7. **Business Associate Agreements (BAA)**: Ensure BAAs with:
   - AWS (for SQS, database hosting)
   - Resend (for email delivery)
   - Any other third-party services

### Regular Maintenance

1. **Data Retention Cleanup**: Run daily cron job:
   ```typescript
   // Schedule in your application
   await dataRetentionService.runRetentionCleanup();
   ```

2. **Audit Log Review**: Regularly review audit logs for suspicious activity

3. **Key Rotation**: Implement encryption key rotation policy

4. **Security Updates**: Keep dependencies updated

## Legal Disclaimer

This implementation provides technical safeguards for HIPAA compliance, but:
- **Not Legal Advice**: This is not legal advice. Consult with a HIPAA compliance expert.
- **Business Associate Agreements**: Ensure all third-party services have BAAs
- **Risk Assessment**: Conduct regular risk assessments
- **Policies and Procedures**: Document policies and procedures
- **Training**: Train staff on HIPAA compliance

## Support

For questions about HIPAA compliance implementation, consult with:
- HIPAA compliance officer
- Legal counsel
- Security team
- Compliance experts

