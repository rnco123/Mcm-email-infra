# Railway Deployment Guide

## Quick Deploy to Railway

Railway makes deployment super simple - no server management needed!

## Step 1: Create Railway Account

1. Go to https://railway.app
2. Sign up with GitHub
3. Authorize Railway to access your GitHub repositories

## Step 2: Create New Project

1. Click **"New Project"**
2. Select **"Deploy from GitHub repo"**
3. Choose your repository: `rnco123/Mcm-email-infra`
4. Railway will auto-detect it's a Node.js project

## Step 3: Configure Build Settings

Railway will auto-detect:
- **Build Command**: `npm run build`
- **Start Command**: `npm run start:prod`

These are already configured in `package.json` and `railway.json`.

## Step 4: Add PostgreSQL Database

1. In your Railway project, click **"+ New"**
2. Select **"Database"** → **"Add PostgreSQL"**
3. Railway will create a PostgreSQL database
4. Note the connection details (you'll need them)

## Step 5: Configure Environment Variables

In Railway project → **Variables** tab, add:

### Required Variables:

```bash
# Database (from Railway PostgreSQL service)
DATABASE_HOST=${{Postgres.PGHOST}}
DATABASE_PORT=${{Postgres.PGPORT}}
DATABASE_USER=${{Postgres.PGUSER}}
DATABASE_PASSWORD=${{Postgres.PGPASSWORD}}
DATABASE_NAME=${{Postgres.PGDATABASE}}
DATABASE_SSL=true

# Encryption Key (REQUIRED for HIPAA)
# Generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
ENCRYPTION_KEY=your-64-character-hex-key-here

# AWS Configuration
AWS_REGION=us-east-2
AWS_SQS_EMAIL_QUEUE_URL=https://sqs.us-east-2.amazonaws.com/YOUR_ACCOUNT/email-queue
AWS_SQS_BROADCAST_QUEUE_URL=https://sqs.us-east-2.amazonaws.com/YOUR_ACCOUNT/broadcast-queue
AWS_SQS_DLQ_URL=https://sqs.us-east-2.amazonaws.com/YOUR_ACCOUNT/dlq

# AWS Credentials (if not using IAM role)
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key

# Application
NODE_ENV=production
PORT=3000
API_PREFIX=api/v1
```

### Railway Database Variables:

Railway provides these automatically when you add PostgreSQL:
- `${{Postgres.PGHOST}}` - Database host
- `${{Postgres.PGPORT}}` - Database port
- `${{Postgres.PGUSER}}` - Database user
- `${{Postgres.PGPASSWORD}}` - Database password
- `${{Postgres.PGDATABASE}}` - Database name

## Step 6: Deploy

1. Railway will automatically deploy when you push to GitHub
2. Or click **"Deploy"** button to trigger manual deployment
3. Watch the build logs in real-time

## Step 7: Get Your URL

1. After deployment, Railway provides a public URL
2. Format: `https://your-app-name.up.railway.app`
3. Railway handles HTTPS automatically

## Step 8: Test Deployment

```bash
# Test your API
curl https://your-app-name.up.railway.app/api/v1/health

# Test webhook endpoint
curl -X POST https://your-app-name.up.railway.app/webhook/resend \
  -H "Content-Type: application/json" \
  -H "resend-signature: test" \
  -d '{"type":"test","data":{"email_id":"test"}}'
```

## Railway Features

### Automatic Deployments
- Deploys on every push to main branch
- Automatic HTTPS/SSL
- Zero-downtime deployments

### Database
- Managed PostgreSQL
- Automatic backups
- Connection pooling

### Environment Variables
- Secure variable storage
- Reference other services (like database)
- Easy to update

### Logs
- Real-time logs in Railway dashboard
- No setup needed

### Scaling
- Auto-scales based on traffic
- Pay for what you use

## Important Notes for Railway

### 1. Long-Running Processes

Railway supports long-running processes, so your SQS processors will work fine.

### 2. AWS SQS Access

You'll need to provide AWS credentials as environment variables:
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_REGION`

Or use AWS IAM user with limited permissions.

### 3. Port Configuration

Railway automatically sets `PORT` environment variable. Your app should use:
```typescript
const port = process.env.PORT || 3000;
```

Your `main.ts` already does this correctly.

### 4. Database Migrations

For production, disable `synchronize: true` and use migrations:
```typescript
synchronize: false, // Use migrations in production
```

## Custom Domain (Optional)

1. Go to project → **Settings** → **Domains**
2. Add your custom domain
3. Railway provides SSL certificate automatically

## Monitoring

Railway provides:
- Real-time logs
- Metrics (CPU, Memory, Network)
- Deployment history
- Error tracking

## Cost

Railway pricing:
- **Hobby Plan**: $5/month (500 hours free)
- **Pro Plan**: $20/month (unlimited)
- Database: Included or separate pricing

## Troubleshooting

### Build Fails
- Check build logs in Railway dashboard
- Ensure all dependencies are in `package.json`
- Verify Node.js version (Railway auto-detects)

### Application Crashes
- Check logs in Railway dashboard
- Verify all environment variables are set
- Check database connection

### SQS Not Working
- Verify AWS credentials are set
- Check IAM permissions
- Verify queue URLs are correct

## Summary

✅ **No server management** - Railway handles everything  
✅ **Automatic HTTPS** - SSL certificates included  
✅ **Easy database** - PostgreSQL with one click  
✅ **Auto-deploy** - Deploys on every push  
✅ **Scales automatically** - Handles traffic spikes  

Railway is perfect for your use case - much simpler than EC2!

