# MCM Email Infrastructure API - Reference Documentation

**For UI Development**

## Table of Contents
1. [Base URLs](#base-urls)
2. [Authentication](#authentication)
3. [API Endpoints](#api-endpoints)
4. [Data Models](#data-models)
5. [Webhook Configuration](#webhook-configuration)
6. [Error Handling](#error-handling)
7. [Key Features](#key-features)

---

## Base URLs

- **Production**: `https://[your-railway-app].railway.app/api/v1`
- **Local Development**: `http://localhost:3000/api/v1`
- **Swagger Documentation**: `https://[your-railway-app].railway.app/api/v1/docs`
- **Health Check UI**: `https://[your-railway-app].railway.app/api/v1/health`

---

## Authentication

All endpoints (except `/tenant` POST and `/webhook/*`) require authentication via API key.

### Header Format
```
X-API-Key: <tenant-api-key>
```

### Getting an API Key
1. Create a tenant: `POST /tenant`
2. Response includes `apiKey` field
3. Use this key for all subsequent requests

### Example
```javascript
const headers = {
  'X-API-Key': '478f1b96-ea62-4c56-a0c7-ade338ddb38e',
  'Content-Type': 'application/json'
};
```

---

## API Endpoints

### Tenant Management

#### Create Tenant
**POST** `/tenant`

**No Authentication Required**

**Request Body:**
```json
{
  "name": "Company Name",
  "isActive": true
}
```

**Response (201):**
```json
{
  "id": "867d163d-047e-4502-8026-abae718e2561",
  "name": "Company Name",
  "apiKey": "478f1b96-ea62-4c56-a0c7-ade338ddb38e",
  "isActive": true,
  "createdAt": "2026-01-06T01:00:00.000Z",
  "updatedAt": "2026-01-06T01:00:00.000Z"
}
```

#### Get Tenant
**GET** `/tenant/:id`

**Request Headers:** `X-API-Key` required

**Response (200):**
```json
{
  "id": "867d163d-047e-4502-8026-abae718e2561",
  "name": "Company Name",
  "apiKey": "478f1b96-ea62-4c56-a0c7-ade338ddb38e",
  "isActive": true,
  "domains": [
    {
      "id": "3218dcfd-2a1f-4bc6-b26b-7ca854dece35",
      "domain": "alerts.myclinicmd.com",
      "isActive": true,
      "createdAt": "2026-01-06T01:00:00.000Z"
    }
  ],
  "createdAt": "2026-01-06T01:00:00.000Z",
  "updatedAt": "2026-01-06T01:00:00.000Z"
}
```

#### Add Domain to Tenant
**POST** `/tenant/:id/domain`

**Request Headers:** `X-API-Key` required

**Request Body:**
```json
{
  "domain": "alerts.myclinicmd.com",
  "resendApiKey": "re_FdKkk94F_DZ5DFRSTQtoiZuVx4Ewbdi8m",
  "isActive": true
}
```

**Response (201):**
```json
{
  "id": "3218dcfd-2a1f-4bc6-b26b-7ca854dece35",
  "domain": "alerts.myclinicmd.com",
  "isActive": true,
  "tenantId": "867d163d-047e-4502-8026-abae718e2561",
  "createdAt": "2026-01-06T01:00:00.000Z",
  "updatedAt": "2026-01-06T01:00:00.000Z"
}
```

---

### Email Management

#### Send Email
**POST** `/email/send`

**Request Headers:** `X-API-Key` required

**Request Body:**
```json
{
  "to": "recipient@example.com",
  "subject": "Test Email",
  "html": "<h1>Hello!</h1><p>This is a test email.</p>",
  "text": "Hello! This is a test email.",
  "from": "sender@alerts.myclinicmd.com",
  "idempotencyKey": "optional-unique-key",
  "metadata": {
    "campaign": "welcome"
  }
}
```

**Note:** Either `html` or `text` is required (or both).

**Response (201):**
```json
{
  "id": "9fdb87e0-3bec-4864-ac96-de3dbfc035a2",
  "tenantId": "867d163d-047e-4502-8026-abae718e2561",
  "to": "[encrypted]",
  "subject": "Test Email",
  "status": "queued",
  "resendEmailId": null,
  "createdAt": "2026-01-06T01:00:00.000Z",
  "updatedAt": "2026-01-06T01:00:00.000Z"
}
```

**Status Values:**
- `queued` - Email queued for sending
- `sent` - Email sent successfully
- `delivered` - Email delivered (from webhook)
- `bounced` - Email bounced (from webhook)
- `complained` - Recipient marked as spam (from webhook)
- `failed` - Email failed to send

#### Get Email Status
**GET** `/email/:id`

**Request Headers:** `X-API-Key` required

**Response (200):**
```json
{
  "id": "9fdb87e0-3bec-4864-ac96-de3dbfc035a2",
  "tenantId": "867d163d-047e-4502-8026-abae718e2561",
  "to": "[encrypted - decrypted in response]",
  "subject": "Test Email",
  "html": "[encrypted - decrypted in response]",
  "text": "[encrypted - decrypted in response]",
  "status": "sent",
  "resendEmailId": "85b223c1-400f-4882-9435-444af8a93d0e",
  "deliveredAt": "2026-01-06T01:00:05.000Z",
  "createdAt": "2026-01-06T01:00:00.000Z",
  "updatedAt": "2026-01-06T01:00:05.000Z"
}
```

**Note:** Email addresses and content are encrypted in database but decrypted in API responses.

---

### Broadcast Campaigns

#### Create Broadcast
**POST** `/broadcast/create`

**Request Headers:** `X-API-Key` required

**Request Body:**
```json
{
  "name": "Monthly Newsletter",
  "subject": "Welcome to our Newsletter!",
  "html": "<h1>Welcome!</h1><p>Thank you for subscribing. Hello {{name}}!</p>",
  "text": "Welcome! Thank you for subscribing. Hello {{name}}!",
  "from": "newsletter@alerts.myclinicmd.com",
  "metadata": {
    "campaign": "newsletter-2026-01"
  }
}
```

**Response (201):**
```json
{
  "id": "4c58719b-22b4-4c77-a0d3-9d3ffd738d31",
  "tenantId": "867d163d-047e-4502-8026-abae718e2561",
  "name": "Monthly Newsletter",
  "subject": "Welcome to our Newsletter!",
  "status": "draft",
  "totalContacts": 0,
  "sentCount": 0,
  "failedCount": 0,
  "createdAt": "2026-01-06T01:00:00.000Z",
  "updatedAt": "2026-01-06T01:00:00.000Z"
}
```

**Status Values:**
- `draft` - Campaign created but not started
- `queued` - Campaign queued for processing
- `processing` - Campaign being processed
- `completed` - All emails sent
- `cancelled` - Campaign cancelled

#### Add Contacts to Broadcast
**POST** `/broadcast/:id/contacts`

**Request Headers:** `X-API-Key` required

**Request Body:**
```json
{
  "contacts": [
    {
      "email": "user1@example.com",
      "personalization": {
        "name": "John Doe"
      }
    },
    {
      "email": "user2@example.com",
      "personalization": {
        "name": "Jane Smith"
      }
    }
  ]
}
```

**Response (200):**
```json
{
  "totalContacts": 2,
  "added": 2,
  "duplicates": 0
}
```

#### Start Broadcast
**POST** `/broadcast/:id/start`

**Request Headers:** `X-API-Key` required

**No Request Body**

**Response (200):**
```json
{
  "id": "4c58719b-22b4-4c77-a0d3-9d3ffd738d31",
  "status": "queued",
  "message": "Broadcast campaign queued for processing"
}
```

#### Get Broadcast Details
**GET** `/broadcast/:id`

**Request Headers:** `X-API-Key` required

**Response (200):**
```json
{
  "id": "4c58719b-22b4-4c77-a0d3-9d3ffd738d31",
  "tenantId": "867d163d-047e-4502-8026-abae718e2561",
  "name": "Monthly Newsletter",
  "subject": "Welcome to our Newsletter!",
  "status": "processing",
  "totalContacts": 3,
  "sentCount": 2,
  "failedCount": 0,
  "createdAt": "2026-01-06T01:00:00.000Z",
  "updatedAt": "2026-01-06T01:00:05.000Z"
}
```

#### Get Broadcast Status
**GET** `/broadcast/:id/status`

**Request Headers:** `X-API-Key` required

**Response (200):**
```json
{
  "id": "4c58719b-22b4-4c77-a0d3-9d3ffd738d31",
  "status": "completed",
  "totalContacts": 3,
  "sentCount": 3,
  "failedCount": 0,
  "progress": 100
}
```

**Use Case:** Poll this endpoint every 2-5 seconds to show real-time progress for large campaigns.

---

### Health Check

#### Get Health Status
**GET** `/health`

**No Authentication Required**

**Response (200):**
```json
{
  "status": "healthy",
  "timestamp": "2026-01-06T01:00:00.000Z",
  "currentTime": "1:00:00 PM",
  "currentDate": "1/6/2026",
  "uptime": 3600,
  "version": "1.0.0",
  "lastApiUsage": {
    "endpoint": "email/send",
    "method": "POST",
    "timestamp": "2026-01-06T00:59:30.000Z",
    "timeAgo": "30 seconds ago"
  },
  "checks": {
    "database": {
      "status": "up",
      "responseTime": "12ms",
      "database": "email_infrastructure",
      "type": "postgres",
      "size": "45.2 MB",
      "used": "45.2 MB",
      "total": "N/A (Supabase managed)"
    },
    "sqs": {
      "status": "up",
      "responseTime": "5ms",
      "emailQueue": "configured",
      "broadcastQueue": "configured"
    },
    "resend": {
      "status": "up",
      "responseTime": "2ms",
      "apiKeyConfigured": true,
      "apiKeyFormat": "valid"
    },
    "memory": {
      "status": "up",
      "heapUsed": "45.2 MB",
      "heapTotal": "128 MB",
      "heapLimit": "512 MB"
    }
  },
  "readiness": {
    "status": "ready",
    "checks": ["database", "sqs"]
  },
  "liveness": {
    "status": "alive",
    "checks": ["memory"]
  }
}
```

**Note:** When accessed from a browser, this endpoint returns a beautiful HTML dashboard UI. Use `?format=json` to get JSON response.

---

## Data Models

### Tenant
```typescript
{
  id: string;              // UUID
  name: string;            // Unique tenant name
  apiKey: string | null;   // API key for authentication
  isActive: boolean;       // Tenant status
  domains: Domain[];       // Associated domains
  createdAt: Date;
  updatedAt: Date;
}
```

### Domain
```typescript
{
  id: string;              // UUID
  domain: string;          // Domain name (e.g., "alerts.myclinicmd.com")
  resendApiKey: string | null;  // Resend API key for this domain
  isActive: boolean;
  tenantId: string;        // Parent tenant ID
  createdAt: Date;
  updatedAt: Date;
}
```

### EmailLog
```typescript
{
  id: string;              // UUID
  tenantId: string;
  to: string;             // Encrypted email address
  subject: string;
  html: string | null;    // Encrypted HTML content
  text: string | null;     // Encrypted text content
  from: string;
  status: EmailStatus;     // queued | sent | delivered | bounced | complained | failed
  resendEmailId: string | null;  // Resend email ID
  deliveredAt: Date | null;
  bouncedAt: Date | null;
  complainedAt: Date | null;
  error: object | null;    // Error details if failed
  retryCount: number;
  createdAt: Date;
  updatedAt: Date;
}
```

### Broadcast
```typescript
{
  id: string;              // UUID
  tenantId: string;
  domainId: string | null;
  name: string;
  subject: string;
  html: string | null;
  text: string | null;
  from: string | null;
  status: BroadcastStatus; // draft | queued | processing | completed | cancelled
  totalContacts: number;
  sentCount: number;
  failedCount: number;
  metadata: object | null;
  contacts: BroadcastContact[];
  createdAt: Date;
  updatedAt: Date;
}
```

### BroadcastContact
```typescript
{
  id: string;              // UUID
  broadcastId: string;
  email: string;           // Encrypted email address
  personalization: object; // Template variables (e.g., { name: "John" })
  status: EmailStatus;     // Same as EmailLog status
  emailLogId: string | null;  // Reference to EmailLog
  createdAt: Date;
}
```

---

## Webhook Configuration

### Webhook Endpoint
**POST** `/webhook/resend`

**No Authentication Required** (uses signature verification)

**Request Headers:**
```
resend-signature: <webhook-signature>
Content-Type: application/json
```

**Request Body (Resend Webhook Format):**
```json
{
  "type": "email.delivered",
  "created_at": "2026-01-06T01:00:00.000Z",
  "data": {
    "email_id": "85b223c1-400f-4882-9435-444af8a93d0e",
    "from": "sender@alerts.myclinicmd.com",
    "to": ["recipient@example.com"],
    "created_at": "2026-01-06T01:00:00.000Z",
    "subject": "Test Email"
  }
}
```

**Webhook Types:**
- `email.sent` - Email sent successfully
- `email.delivered` - Email delivered to recipient
- `email.delivery_delayed` - Delivery delayed
- `email.complained` - Recipient marked as spam
- `email.bounced` - Email bounced
- `email.opened` - Email opened (if tracking enabled)
- `email.clicked` - Link clicked (if tracking enabled)

**Response (200):**
```json
{
  "received": true
}
```

### Configuring Webhook in Resend
1. Go to Resend Dashboard → Webhooks
2. Add webhook URL: `https://[your-railway-app].railway.app/api/v1/webhook/resend`
3. Select events: `email.sent`, `email.delivered`, `email.bounced`, `email.complained`
4. Copy webhook secret
5. Set `RESEND_WEBHOOK_SECRET` environment variable in Railway

---

## Error Handling

### Standard Error Response
```json
{
  "statusCode": 401,
  "message": "API key is required",
  "timestamp": "2026-01-06T01:00:00.000Z",
  "path": "/api/v1/email/send"
}
```

### Common Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized (missing/invalid API key)
- `404` - Not Found
- `500` - Internal Server Error
- `503` - Service Unavailable (health check)

### Error Example
```javascript
try {
  const response = await fetch(`${baseUrl}/email/send`, {
    method: 'POST',
    headers: {
      'X-API-Key': apiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(emailData)
  });
  
  if (!response.ok) {
    const error = await response.json();
    console.error('API Error:', error.message);
  }
} catch (error) {
  console.error('Network Error:', error);
}
```

---

## Key Features

### 1. Multi-Tenant Isolation
- Each tenant has unique API key
- Complete data isolation between tenants
- Row-level security in database

### 2. HIPAA Compliance
- PHI encryption at rest (email addresses, content)
- Audit logging for all API access
- PHI masking in logs
- Secure error handling

### 3. Email Encryption
- Email addresses encrypted in database
- Email content encrypted in database
- Automatically decrypted in API responses
- No PHI exposure in logs

### 4. Async Processing
- Emails queued via AWS SQS
- Broadcast campaigns processed in batches (100 contacts per batch)
- Automatic retry on failure
- Dead letter queue for failed messages

### 5. Real-Time Updates
- Webhooks update email status in real-time
- Broadcast progress tracked via status endpoint
- Poll `/broadcast/:id/status` for progress updates

### 6. Template Personalization
- Use `{{variable}}` syntax in broadcast templates
- Personalization data per contact
- Supports HTML and text templates

---

## UI Development Recommendations

### 1. API Client Setup
```typescript
// api-client.ts
const API_BASE_URL = 'https://[your-railway-app].railway.app/api/v1';

class EmailInfraAPI {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'X-API-Key': this.apiKey,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message);
    }
    
    return response.json();
  }

  async sendEmail(data: SendEmailDto) {
    return this.request('/email/send', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getEmailStatus(id: string) {
    return this.request(`/email/${id}`);
  }

  // ... other methods
}
```

### 2. Broadcast Progress Tracking
```typescript
// Poll broadcast status every 2 seconds
async function trackBroadcastProgress(broadcastId: string) {
  const interval = setInterval(async () => {
    const status = await api.getBroadcastStatus(broadcastId);
    
    updateProgressBar(status.progress);
    updateCounts(status.sentCount, status.failedCount);
    
    if (status.status === 'completed' || status.status === 'cancelled') {
      clearInterval(interval);
    }
  }, 2000);
}
```

### 3. Webhook Integration
```typescript
// Set up webhook listener (if using server-side)
// Or use Server-Sent Events (SSE) to stream updates
// Or poll email status after sending
```

### 4. Health Check Dashboard
- Use `/health` endpoint for system monitoring
- Display component status
- Show database memory usage
- Monitor last API usage

---

## Environment Variables (Backend)

These are for reference - not needed in UI:

```
DATABASE_HOST=
DATABASE_PORT=5432
DATABASE_USER=
DATABASE_PASSWORD=
DATABASE_NAME=
DATABASE_SSL=true

AWS_REGION=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_SQS_EMAIL_QUEUE_URL=
AWS_SQS_BROADCAST_QUEUE_URL=
AWS_SQS_DLQ_URL=

RESEND_API_KEY=
RESEND_WEBHOOK_SECRET=

ENCRYPTION_KEY=

NODE_ENV=production
PORT=3000
API_PREFIX=api/v1
```

---

## Quick Start for UI

1. **Get API Key**
   ```javascript
   const tenant = await fetch(`${API_BASE_URL}/tenant`, {
     method: 'POST',
     body: JSON.stringify({ name: 'My Company' })
   }).then(r => r.json());
   
   const apiKey = tenant.apiKey;
   ```

2. **Add Domain**
   ```javascript
   await fetch(`${API_BASE_URL}/tenant/${tenant.id}/domain`, {
     method: 'POST',
     headers: { 'X-API-Key': apiKey },
     body: JSON.stringify({
       domain: 'alerts.myclinicmd.com',
       resendApiKey: 're_...',
       isActive: true
     })
   });
   ```

3. **Send Email**
   ```javascript
   const email = await fetch(`${API_BASE_URL}/email/send`, {
     method: 'POST',
     headers: { 'X-API-Key': apiKey },
     body: JSON.stringify({
       to: 'recipient@example.com',
       subject: 'Hello',
       html: '<h1>Hello!</h1>',
       from: 'sender@alerts.myclinicmd.com'
     })
   }).then(r => r.json());
   ```

4. **Create Broadcast**
   ```javascript
   const broadcast = await fetch(`${API_BASE_URL}/broadcast/create`, {
     method: 'POST',
     headers: { 'X-API-Key': apiKey },
     body: JSON.stringify({
       name: 'Newsletter',
       subject: 'Welcome!',
       html: '<p>Hello {{name}}!</p>',
       from: 'newsletter@alerts.myclinicmd.com'
     })
   }).then(r => r.json());
   ```

---

## Support

- **Swagger Docs**: `https://[your-railway-app].railway.app/api/v1/docs`
- **Health Check**: `https://[your-railway-app].railway.app/api/v1/health`

---

**Last Updated**: 2026-01-06
**API Version**: 1.0.0




