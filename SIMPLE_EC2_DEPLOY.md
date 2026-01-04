# Simple EC2 Deployment (No Docker Required)

## Overview

Deploy your Email Infrastructure API directly on EC2 without Docker. This is the **simplest and fastest** way to get your application running.

## Architecture

```
Application Load Balancer (ALB)
         ↓
    EC2 Instance
    ├── Node.js 20 (directly installed)
    ├── PM2 (process manager)
    ├── API Server (NestJS)
    ├── Email Processor (SQS worker)
    └── Broadcast Processor (SQS worker)
         ↓
    RDS PostgreSQL
```

## Prerequisites

- AWS Account
- EC2 Instance (t3.small or larger)
- RDS PostgreSQL database
- SQS queues configured

## Step-by-Step Deployment

### 1. Launch EC2 Instance

1. Go to **EC2 Console** → **Launch Instance**
2. **Name**: `email-infrastructure-api`
3. **AMI**: Amazon Linux 2023 (or Ubuntu 22.04)
4. **Instance Type**: t3.small (2 vCPU, 2GB RAM)
5. **Key Pair**: Create or select existing
6. **Network Settings**:
   - VPC: Your VPC
   - Subnet: Public or Private (with NAT)
   - Auto-assign Public IP: Enable (if public subnet)
   - Security Group: Create new
     - SSH (22) from your IP
     - HTTP (80) from 0.0.0.0/0 (for ALB)
     - HTTPS (443) from 0.0.0.0/0 (for ALB)
     - Custom TCP (3000) from ALB security group (optional)
7. **Storage**: 20GB gp3 (default is fine)
8. **IAM Role**: Create role with permissions for:
   - SQS (read, write, delete)
   - Secrets Manager (if using)
   - CloudWatch Logs
9. **Launch Instance**

### 2. Connect to EC2

```bash
# For Amazon Linux
ssh -i your-key.pem ec2-user@your-ec2-ip

# For Ubuntu
ssh -i your-key.pem ubuntu@your-ec2-ip
```

### 3. Install Node.js 20

**For Amazon Linux:**
```bash
# Install Node.js 20
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo yum install -y nodejs

# Verify installation
node --version  # Should show v20.x.x
npm --version
```

**For Ubuntu:**
```bash
# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version  # Should show v20.x.x
npm --version
```

### 4. Install PM2 (Process Manager)

```bash
sudo npm install -g pm2

# Verify installation
pm2 --version
```

### 5. Install Git and Clone Repository

**For Amazon Linux:**
```bash
sudo yum install -y git
```

**For Ubuntu:**
```bash
sudo apt-get update
sudo apt-get install -y git
```

**Clone repository:**
```bash
git clone https://github.com/rnco123/Mcm-email-infra.git
cd Mcm-email-infra
```

### 6. Install Dependencies and Build

```bash
# Install dependencies
npm install

# Build application
npm run build

# Verify build
ls -la dist/
```

### 7. Configure Environment Variables

Create `.env` file:

```bash
nano .env
```

Add the following (replace with your actual values):

```bash
# Database Configuration
DATABASE_HOST=your-rds-endpoint.region.rds.amazonaws.com
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=your-secure-password
DATABASE_NAME=email_infrastructure
DATABASE_SSL=true

# Encryption Key (REQUIRED for HIPAA)
# Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
ENCRYPTION_KEY=your-64-character-hex-encryption-key-here

# AWS Configuration
AWS_REGION=us-east-1
AWS_SQS_EMAIL_QUEUE_URL=https://sqs.us-east-1.amazonaws.com/123456789/email-queue
AWS_SQS_BROADCAST_QUEUE_URL=https://sqs.us-east-1.amazonaws.com/123456789/broadcast-queue
AWS_SQS_DLQ_URL=https://sqs.us-east-1.amazonaws.com/123456789/dlq

# Application Configuration
NODE_ENV=production
PORT=3000
API_PREFIX=api/v1

# Data Retention (Optional - defaults to 7 years)
EMAIL_RETENTION_DAYS=2555
CONTACT_RETENTION_DAYS=2555
AUDIT_RETENTION_DAYS=2555
```

**⚠️ Security Best Practice:** For production, use AWS Secrets Manager:

```bash
# Install AWS CLI if not already installed
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Create secret
aws secretsmanager create-secret \
  --name email-infra/env \
  --secret-string file://.env \
  --region us-east-1
```

### 8. Start Application with PM2

```bash
# Start application
pm2 start dist/main.js --name email-api

# Save PM2 configuration
pm2 save

# Set up PM2 to start on system boot
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u $USER --hp $HOME
# Copy and run the command it outputs
```

### 9. Verify Application is Running

```bash
# Check status
pm2 status

# View logs
pm2 logs email-api --lines 50

# Test locally
curl http://localhost:3000/api/v1/health
# Or test any endpoint
curl http://localhost:3000
```

### 10. Set up Application Load Balancer

1. Go to **EC2 Console** → **Load Balancers** → **Create Load Balancer**
2. Choose **Application Load Balancer**
3. **Basic Configuration**:
   - Name: `email-api-alb`
   - Scheme: Internet-facing
   - IP address type: IPv4
4. **Network Mapping**:
   - VPC: Your VPC
   - Availability Zones: Select at least 2
   - Subnets: Select public subnets
5. **Security Groups**: Create or select one that allows:
   - HTTP (80) from 0.0.0.0/0
   - HTTPS (443) from 0.0.0.0/0
6. **Listeners and Routing**:
   - Listener 1: HTTP (80) → Redirect to HTTPS (443)
   - Listener 2: HTTPS (443) → Target Group
7. **Default SSL Certificate**: Request or import certificate from ACM
8. **Target Group**:
   - Name: `email-api-targets`
   - Target type: Instances
   - Protocol: HTTP
   - Port: 3000
   - Health check:
     - Path: `/` (or create a health endpoint)
     - Protocol: HTTP
     - Port: 3000
     - Healthy threshold: 2
     - Unhealthy threshold: 2
     - Timeout: 5
     - Interval: 30
9. **Register Targets**: Add your EC2 instance
10. **Create Load Balancer**

### 11. Test Deployment

```bash
# Get ALB DNS name
# Format: email-api-alb-123456789.us-east-1.elb.amazonaws.com

# Test via ALB
curl http://your-alb-dns-name/api/v1/health
```

## Management Commands

### PM2 Commands

```bash
# View status
pm2 status

# View logs
pm2 logs email-api
pm2 logs email-api --lines 100  # Last 100 lines

# Restart application
pm2 restart email-api

# Stop application
pm2 stop email-api

# Start application
pm2 start email-api

# Delete from PM2
pm2 delete email-api

# Monitor (real-time)
pm2 monit
```

### Application Updates

```bash
cd ~/Mcm-email-infra

# Pull latest changes
git pull

# Install new dependencies (if any)
npm install

# Rebuild
npm run build

# Restart with PM2
pm2 restart email-api
```

## Monitoring Setup

### CloudWatch Logs

```bash
# Install CloudWatch agent
wget https://s3.amazonaws.com/amazoncloudwatch-agent/amazon_linux/amd64/latest/amazon-cloudwatch-agent.rpm
sudo rpm -U ./amazon-cloudwatch-agent.rpm

# Configure (interactive)
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-config-wizard

# Or use this config file
sudo nano /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json
```

CloudWatch config example:
```json
{
  "logs": {
    "logs_collected": {
      "files": {
        "collect_list": [
          {
            "file_path": "/home/ec2-user/.pm2/logs/email-api-out.log",
            "log_group_name": "/aws/ec2/email-api",
            "log_stream_name": "application"
          },
          {
            "file_path": "/home/ec2-user/.pm2/logs/email-api-error.log",
            "log_group_name": "/aws/ec2/email-api",
            "log_stream_name": "errors"
          }
        ]
      }
    }
  }
}
```

```bash
# Start CloudWatch agent
sudo systemctl start amazon-cloudwatch-agent
sudo systemctl enable amazon-cloudwatch-agent
```

### PM2 Log Rotation

```bash
# Install PM2 log rotation
pm2 install pm2-logrotate

# Configure
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
pm2 set pm2-logrotate:compress true
```

## Security Hardening

### 1. Use AWS Secrets Manager

Instead of `.env` file, use Secrets Manager:

```bash
# Store secrets
aws secretsmanager create-secret \
  --name email-infra/production \
  --secret-string file://.env \
  --region us-east-1

# Retrieve in application (update code to read from Secrets Manager)
```

### 2. Update Application to Use Secrets Manager

You can modify your application to read from Secrets Manager instead of `.env` file.

### 3. Security Group Rules

- Only allow SSH from your IP
- Only allow HTTP/HTTPS from ALB security group
- Remove direct access to port 3000 from internet

### 4. System Updates

```bash
# Amazon Linux
sudo yum update -y

# Ubuntu
sudo apt-get update && sudo apt-get upgrade -y
```

## Troubleshooting

### Application Not Starting

```bash
# Check PM2 logs
pm2 logs email-api --lines 100

# Check if port is in use
sudo netstat -tlnp | grep 3000

# Check environment variables
pm2 env email-api

# Check if Node.js is running
ps aux | grep node
```

### Database Connection Issues

```bash
# Test database connection
psql -h your-rds-endpoint -U postgres -d email_infrastructure

# Check security groups allow connection from EC2
```

### SQS Access Issues

```bash
# Test AWS credentials
aws sts get-caller-identity

# Test SQS access
aws sqs get-queue-attributes \
  --queue-url your-queue-url \
  --attribute-names All
```

### High Memory Usage

```bash
# Check memory usage
free -h
pm2 monit

# If needed, increase instance size or optimize application
```

## Auto Scaling (Optional)

1. **Create Launch Template** from current instance
2. **Create Auto Scaling Group**:
   - Min: 1
   - Max: 3
   - Desired: 1
   - Target Tracking: CPU 70%
3. **Attach to ALB Target Group**

## Cost Estimate

- **EC2 t3.small**: ~$15/month (24/7)
- **ALB**: ~$16/month
- **Data Transfer**: ~$0.09/GB
- **Total**: ~$31-35/month (plus RDS and SQS)

## Next Steps

1. ✅ Set up RDS PostgreSQL
2. ✅ Create SQS queues
3. ✅ Configure IAM roles
4. ✅ Set up CloudWatch alarms
5. ✅ Configure backups
6. ✅ Set up CI/CD (optional)

## Summary

✅ **No Docker required** - Just Node.js directly on EC2  
✅ **Simple deployment** - Install, build, run  
✅ **Easy to manage** - PM2 handles process management  
✅ **Fast updates** - Git pull, rebuild, restart  
✅ **Full control** - Direct access to logs and processes  

This is the **simplest and fastest** way to deploy your application!

