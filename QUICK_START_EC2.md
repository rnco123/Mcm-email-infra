# Quick Start: EC2 Deployment

## Prerequisites

1. AWS Account
2. EC2 Instance (t3.small or larger)
3. Security Group configured:
   - SSH (22) from your IP
   - HTTP (80) from ALB
   - HTTPS (443) from ALB
   - Custom TCP (3000) from ALB (or use ALB only)

## Step 1: Launch EC2 Instance

1. Go to EC2 Console → Launch Instance
2. Choose Amazon Linux 2023 or Ubuntu 22.04
3. Instance Type: t3.small (2 vCPU, 2GB RAM)
4. Configure Security Group (see above)
5. Create/Select Key Pair for SSH
6. Launch Instance

## Step 2: Connect to EC2

```bash
ssh -i your-key.pem ec2-user@your-ec2-ip
# Or for Ubuntu:
ssh -i your-key.pem ubuntu@your-ec2-ip
```

## Step 3: Run Deployment Script

```bash
# Download and run deployment script
curl -o ec2-deploy.sh https://raw.githubusercontent.com/rnco123/Mcm-email-infra/main/ec2-deploy.sh
chmod +x ec2-deploy.sh
./ec2-deploy.sh
```

Or manually:

```bash
# Install Node.js 20
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo yum install -y nodejs

# Install PM2
sudo npm install -g pm2

# Clone repository
git clone https://github.com/rnco123/Mcm-email-infra.git
cd Mcm-email-infra

# Install and build
npm install
npm run build

# Create .env file (see below)
nano .env

# Start with PM2
pm2 start dist/main.js --name email-api
pm2 save
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u $USER --hp $HOME
```

## Step 4: Configure Environment Variables

Create `.env` file:

```bash
# Database
DATABASE_HOST=your-rds-endpoint.region.rds.amazonaws.com
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=your-secure-password
DATABASE_NAME=email_infrastructure
DATABASE_SSL=true

# Encryption (REQUIRED for HIPAA)
ENCRYPTION_KEY=your-32-character-encryption-key-here

# AWS
AWS_REGION=us-east-1
AWS_SQS_EMAIL_QUEUE_URL=https://sqs.region.amazonaws.com/account/email-queue
AWS_SQS_BROADCAST_QUEUE_URL=https://sqs.region.amazonaws.com/account/broadcast-queue
AWS_SQS_DLQ_URL=https://sqs.region.amazonaws.com/account/dlq

# Application
NODE_ENV=production
PORT=3000
API_PREFIX=api/v1

# Data Retention (optional)
EMAIL_RETENTION_DAYS=2555
CONTACT_RETENTION_DAYS=2555
AUDIT_RETENTION_DAYS=2555
```

**⚠️ Security Best Practice:** Use AWS Secrets Manager instead of .env file:

```bash
# Install AWS CLI if not already installed
aws secretsmanager create-secret \
  --name email-infra/env \
  --secret-string file://.env
```

Then use AWS Systems Manager Parameter Store or Secrets Manager in your application.

## Step 5: Set up Application Load Balancer

1. Go to EC2 → Load Balancers → Create Load Balancer
2. Choose Application Load Balancer
3. Configure:
   - Scheme: Internet-facing
   - Listeners: HTTP (80) and HTTPS (443)
   - Availability Zones: Select your VPC subnets
4. Security Group: Allow HTTP/HTTPS from internet
5. Target Group:
   - Target type: Instances
   - Protocol: HTTP
   - Port: 3000
   - Health check path: `/api/v1/health` (or `/`)
6. Register your EC2 instance
7. Configure SSL certificate (ACM)

## Step 6: Verify Deployment

```bash
# Check PM2 status
pm2 status

# View logs
pm2 logs email-api

# Test API
curl http://localhost:3000/api/v1/health
```

## Step 7: Set up Auto Scaling (Optional)

1. Create Launch Template from current instance
2. Create Auto Scaling Group
3. Configure:
   - Min: 1
   - Max: 3
   - Desired: 1
   - Target Tracking: CPU 70%

## Monitoring

### CloudWatch Logs

```bash
# Install CloudWatch agent
wget https://s3.amazonaws.com/amazoncloudwatch-agent/amazon_linux/amd64/latest/amazon-cloudwatch-agent.rpm
sudo rpm -U ./amazon-cloudwatch-agent.rpm

# Configure (follow prompts)
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-config-wizard
```

### PM2 Monitoring

```bash
# Install PM2 monitoring
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

## Troubleshooting

### Application not starting:
```bash
pm2 logs email-api --lines 50
```

### Check if port is listening:
```bash
sudo netstat -tlnp | grep 3000
```

### Restart application:
```bash
pm2 restart email-api
```

### Check environment variables:
```bash
pm2 env email-api
```

## Next Steps

1. Set up RDS PostgreSQL database
2. Create SQS queues
3. Configure IAM roles for EC2
4. Set up CloudWatch alarms
5. Configure backup strategy
6. Set up CI/CD pipeline

