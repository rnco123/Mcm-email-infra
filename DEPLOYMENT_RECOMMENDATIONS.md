# AWS Deployment Recommendations

## Architecture Analysis

Your application has:
1. **API Server**: NestJS/Fastify HTTP server
2. **Long-running SQS Processors**: Two background workers that poll SQS continuously
3. **Database Connections**: PostgreSQL with TypeORM (needs connection pooling)
4. **HIPAA Compliance**: Requires persistent services for audit logging and encryption

## Recommendation: **EC2 (No Docker Required)** ⭐ Simplest Option


## ⭐ **EC2 - Direct Node.js Deployment** (Recommended - No Docker)

### Why EC2 (No Docker)?

✅ **Pros:**
- **No Docker required** - Just install Node.js and run
- Full control over the environment
- Simpler setup - fastest to deploy
- Better for HIPAA (easier to audit and control)
- Predictable costs
- Easy to debug and monitor
- Direct access to logs and processes
- No container overhead

❌ **Cons:**
- Manual scaling (or use Auto Scaling Groups)
- Server management required
- More expensive for low traffic
- Need to handle OS updates

### Architecture:
```
┌─────────────────────────────────────┐
│  Application Load Balancer (ALB)   │
└──────────────┬──────────────────────┘
               │
         ┌─────▼─────┐
         │  EC2      │
         │  Instance │
         │           │
         │ - API     │
         │ - Workers │
         └───────────┘
```

### When to use EC2:
- Small to medium traffic
- Need full control
- Budget allows for always-on instance
- Simpler deployment initially

---

## Alternative: **Hybrid Approach** (Most Scalable)

### Architecture:
```
┌─────────────────────────────────────┐
│  API Gateway + Lambda              │
│  (API endpoints)                    │
└──────────────┬──────────────────────┘
               │
    ┌──────────┴──────────┐
    │                     │
┌───▼────────┐    ┌───────▼────────┐
│ Lambda     │    │ ECS/EC2        │
│ Functions  │    │ Workers         │
│            │    │                 │
│ - API      │    │ - Email Proc    │
│ - Webhooks │    │ - Broadcast Proc│
└────────────┘    └─────────────────┘
```

### Why Hybrid?
- API scales automatically (Lambda)
- Workers run on ECS/EC2 (long-running)
- Cost-effective for variable traffic
- More complex to set up

---

## ❌ NOT Recommended: Pure Lambda

### Why Lambda doesn't work:
- ❌ SQS processors need to run continuously (Lambda is event-driven)
- ❌ 15-minute timeout limit (processors run indefinitely)
- ❌ Cold starts affect performance
- ❌ Database connection pooling challenges
- ❌ More expensive for long-running processes

---

## Cost Comparison (Estimated)

### EC2:
- **t3.small** (2 vCPU, 2GB RAM) = ~$15/month
- **ALB**: ~$16/month
- **Total**: **~$31/month**


---

## My Recommendation: **Start with EC2, Migrate to ECS**

### Phase 1: EC2 (Now)
1. **Quick to deploy** - Get running in hours
2. **Full control** - Easier for HIPAA compliance
3. **Simple monitoring** - CloudWatch + SSH access
4. **Cost-effective** for initial traffic

### Phase 2: Auto Scaling (Later)
1. **When traffic grows** - Set up Auto Scaling Groups
2. **Load balancing** - Multiple instances behind ALB
3. **Cost optimization** - Scale up/down based on demand

---

## Implementation Guide

### Option A: EC2 Deployment

1. **Launch EC2 Instance:**
   - AMI: Amazon Linux 2023 or Ubuntu 22.04
   - Instance Type: t3.small (2 vCPU, 2GB RAM)
   - Security Group: Allow HTTP (80), HTTPS (443), SSH (22)
   - IAM Role: SQS access, Secrets Manager (for encryption key)

2. **Install Dependencies:**
   ```bash
   # Install Node.js 20
   curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
   sudo yum install -y nodejs
   
   # Install PM2 for process management
   sudo npm install -g pm2
   
   # Install PostgreSQL client (if needed)
   sudo yum install -y postgresql15
   ```

3. **Deploy Application:**
   ```bash
   # Clone repository
   git clone https://github.com/rnco123/Mcm-email-infra.git
   cd Mcm-email-infra
   
   # Install dependencies
   npm install
   
   # Build
   npm run build
   
   # Set up environment variables
   # (Use AWS Secrets Manager or Parameter Store for HIPAA)
   
   # Start with PM2
   pm2 start dist/main.js --name email-api
   pm2 save
   pm2 startup
   ```

4. **Set up Application Load Balancer:**
   - Create ALB
   - Add EC2 instance to target group
   - Configure health checks
   - Set up SSL certificate (ACM)

5. **Set up Auto Scaling (Optional):**
   - Create Launch Template
   - Configure Auto Scaling Group
   - Set min/max instances


## HIPAA Compliance Considerations

### For EC2:
- ✅ Use AWS Systems Manager Session Manager (no SSH keys)
- ✅ Enable CloudTrail for audit logging
- ✅ Use AWS Secrets Manager for encryption keys
- ✅ Enable VPC Flow Logs
- ✅ Use encrypted EBS volumes
- ✅ Regular security updates


---

## Monitoring & Logging

### Required:
1. **CloudWatch Logs**: Application logs
2. **CloudWatch Metrics**: CPU, Memory, Request count
3. **CloudWatch Alarms**: Set up alerts for errors
4. **X-Ray** (optional): Distributed tracing

### Setup:
```bash
# Install CloudWatch agent (EC2)
wget https://s3.amazonaws.com/amazoncloudwatch-agent/amazon_linux/amd64/latest/amazon-cloudwatch-agent.rpm
sudo rpm -U ./amazon-cloudwatch-agent.rpm
```

---

## Security Best Practices

1. **Secrets Management:**
   - Use AWS Secrets Manager for `ENCRYPTION_KEY`
   - Use Parameter Store for non-sensitive config
   - Never commit secrets to git

2. **Network Security:**
   - Use VPC with private subnets
   - Security groups with least privilege
   - Use NAT Gateway for outbound traffic

3. **Database:**
   - RDS in private subnet
   - Enable encryption at rest
   - Use SSL/TLS connections
   - Regular backups

4. **Access Control:**
   - IAM roles (not access keys)
   - MFA for console access
   - Least privilege principle

---

## Next Steps

1. **Choose deployment option** (I recommend EC2 to start)
2. **Set up AWS resources** (VPC, RDS, SQS, Secrets Manager)
3. **Deploy application**
4. **Set up monitoring and alerts**
5. **Configure auto-scaling** (when needed)
6. **Set up CI/CD pipeline** (GitHub Actions → AWS)

---

## Quick Start: EC2 Deployment Script

I can create a deployment script that:
- Sets up EC2 instance
- Installs dependencies
- Deploys application
- Configures PM2
- Sets up CloudWatch logging

Would you like me to create this?

