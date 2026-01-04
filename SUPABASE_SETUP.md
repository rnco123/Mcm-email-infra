# Supabase Database Connection Guide

## Quick Setup for Supabase

Your application is already configured to work with Supabase! Supabase uses PostgreSQL, which is fully supported.

## Step 1: Get Your Supabase Connection Details

1. Go to your Supabase project dashboard
2. Navigate to **Settings** → **Database**
3. Find the **Connection string** section
4. Copy your connection details:
   - **Host**: `db.xxxxx.supabase.co`
   - **Port**: `5432` (default)
   - **Database**: `postgres` (default)
   - **User**: `postgres` (default)
   - **Password**: Your database password (from Supabase dashboard)
   - **SSL**: Required (always `true` for Supabase)

## Step 2: Configure Environment Variables

Add these to your `.env` file:

```bash
# Supabase Database Configuration (Direct PostgreSQL Connection)
# Note: You DON'T need the anon key for database connections
# The anon key is only for Supabase REST API/client SDK
DATABASE_HOST=db.xxxxx.supabase.co
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=your-supabase-password
DATABASE_NAME=postgres
DATABASE_SSL=true

# Encryption Key (REQUIRED for HIPAA)
ENCRYPTION_KEY=7599df2684ae74c02db1f29484cb5727cf45067f437e9acc9f867f145e146e30

# AWS Configuration
AWS_REGION=us-east-2
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_SQS_EMAIL_QUEUE_URL=your-queue-url
AWS_SQS_BROADCAST_QUEUE_URL=your-queue-url
AWS_SQS_DLQ_URL=your-dlq-url

# Application
NODE_ENV=development
PORT=3000
API_PREFIX=api/v1
```

## Step 3: Test Connection

The application will automatically:
- Connect to Supabase using SSL
- Create tables if `synchronize: true` (development mode)
- Handle all PostgreSQL operations

## Important Notes

### SSL Configuration
- Supabase **requires SSL** connections
- Set `DATABASE_SSL=true` in your `.env`
- The app is configured with `rejectUnauthorized: false` for Supabase's self-signed certificates

### Connection Pooling
- Supabase provides connection pooling
- Your app will use direct connections (port 5432)
- For production, consider using Supabase's connection pooler (port 6543)

### Database Name
- Default Supabase database is `postgres`
- You can create a new database if needed
- Update `DATABASE_NAME` accordingly

## Troubleshooting

### Connection Refused
- Check if `DATABASE_SSL=true` is set
- Verify your Supabase project is active
- Check firewall/network settings

### SSL Certificate Error
- The app uses `rejectUnauthorized: false` which should work
- If issues persist, check Supabase SSL settings

### Authentication Failed
- Verify your password is correct
- Check if your IP is allowed (Supabase allows all by default)
- Ensure you're using the `postgres` user

## Using Supabase Connection Pooler (Optional)

For better performance in production, use Supabase's connection pooler:

```bash
# Use pooler port instead
DATABASE_HOST=db.xxxxx.supabase.co
DATABASE_PORT=6543  # Pooler port instead of 5432
DATABASE_USER=postgres
DATABASE_PASSWORD=your-password
DATABASE_NAME=postgres
DATABASE_SSL=true
```

## Current Configuration Status

✅ **Your app is ready for Supabase!**

The configuration in `src/app.module.ts` supports:
- ✅ PostgreSQL (Supabase uses PostgreSQL)
- ✅ SSL connections (required by Supabase)
- ✅ Environment variable configuration
- ✅ Automatic schema synchronization (development mode)

Just update your `.env` file with Supabase credentials and you're good to go!

