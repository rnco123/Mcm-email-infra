# IAM Role Setup for EC2 Instance

## Overview

Create an IAM role with **limited, least-privilege permissions** for your EC2 instance. This is more secure than using access keys and follows AWS best practices.

## Required AWS Services

Your application needs access to:
1. **SQS** - Send, receive, and delete messages from queues
2. **Secrets Manager** (Optional) - For storing encryption keys securely
3. **CloudWatch Logs** - For application logging

## Step-by-Step: Create IAM Role

### Step 1: Create IAM Role

1. Go to **IAM Console** → **Roles** → **Create Role**
2. **Trusted entity type**: AWS service
3. **Use case**: EC2
4. Click **Next**

### Step 2: Create Custom Policy

Instead of using managed policies, create a custom policy with minimal permissions:

1. Click **Create Policy** (opens in new tab)
2. Go to **JSON** tab
3. Paste the following policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "SQSPermissions",
      "Effect": "Allow",
      "Action": [
        "sqs:SendMessage",
        "sqs:ReceiveMessage",
        "sqs:DeleteMessage",
        "sqs:GetQueueAttributes",
        "sqs:GetQueueUrl"
      ],
      "Resource": [
        "arn:aws:sqs:us-east-2:*:email-queue",
        "arn:aws:sqs:us-east-2:*:email-queue/*",
        "arn:aws:sqs:us-east-2:*:broadcast-queue",
        "arn:aws:sqs:us-east-2:*:broadcast-queue/*",
        "arn:aws:sqs:us-east-2:*:dlq",
        "arn:aws:sqs:us-east-2:*:dlq/*"
      ]
    },
    {
      "Sid": "CloudWatchLogs",
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents",
        "logs:DescribeLogStreams"
      ],
      "Resource": "arn:aws:logs:us-east-2:*:log-group:/aws/ec2/email-api*"
    },
    {
      "Sid": "SecretsManagerReadOnly",
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue",
        "secretsmanager:DescribeSecret"
      ],
      "Resource": "arn:aws:secretsmanager:us-east-2:*:secret:email-infra/*"
    }
  ]
}
```

**Important:** Replace `us-east-2` with your actual AWS region if different.

4. Click **Next**
5. **Policy name**: `EmailInfraEC2Policy`
6. **Description**: `Policy for Email Infrastructure API EC2 instance - SQS, CloudWatch, Secrets Manager`
7. Click **Create Policy**

### Step 3: Attach Policy to Role

1. Go back to the **Create Role** tab
2. Refresh the policies list
3. Search for `EmailInfraEC2Policy`
4. Select it
5. Click **Next**

### Step 4: Name and Create Role

1. **Role name**: `EmailInfraEC2Role`
2. **Description**: `IAM role for Email Infrastructure API EC2 instance`
3. Click **Create Role**

### Step 5: Attach Role to EC2 Instance

**Option A: During Instance Launch (if not launched yet)**
- In EC2 Launch Wizard, under **Advanced details**
- **IAM instance profile**: Select `EmailInfraEC2Role`

**Option B: Attach to Existing Instance**
1. Go to **EC2 Console** → **Instances**
2. Select your instance: `i-0a1f8dbbff4a24d19`
3. Click **Actions** → **Security** → **Modify IAM role**
4. Select `EmailInfraEC2Role`
5. Click **Update IAM role**

## Policy Breakdown

### SQS Permissions
- `SendMessage` - Send emails to queue
- `ReceiveMessage` - Process queued messages
- `DeleteMessage` - Remove processed messages
- `GetQueueAttributes` - Get queue information
- `GetQueueUrl` - Resolve queue URLs

**Resource ARNs**: Limited to specific queue names (email-queue, broadcast-queue, dlq)

### CloudWatch Logs Permissions
- `CreateLogGroup` - Create log groups
- `CreateLogStream` - Create log streams
- `PutLogEvents` - Write log entries
- `DescribeLogStreams` - List log streams

**Resource ARNs**: Limited to `/aws/ec2/email-api*` log groups

### Secrets Manager Permissions (Optional)
- `GetSecretValue` - Retrieve secret values
- `DescribeSecret` - Get secret metadata

**Resource ARNs**: Limited to `email-infra/*` secrets

## More Restrictive Policy (Recommended)

If you know your exact queue ARNs, use this more restrictive version:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "SQSPermissions",
      "Effect": "Allow",
      "Action": [
        "sqs:SendMessage",
        "sqs:ReceiveMessage",
        "sqs:DeleteMessage",
        "sqs:GetQueueAttributes"
      ],
      "Resource": [
        "arn:aws:sqs:us-east-2:537124932549:email-queue",
        "arn:aws:sqs:us-east-2:537124932549:broadcast-queue",
        "arn:aws:sqs:us-east-2:537124932549:dlq"
      ]
    },
    {
      "Sid": "CloudWatchLogs",
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:us-east-2:537124932549:log-group:/aws/ec2/email-api*"
    }
  ]
}
```

**Replace:**
- `537124932549` with your AWS Account ID
- `us-east-2` with your region

## Verify IAM Role

After attaching the role, verify it works:

```bash
# SSH into your EC2 instance
ssh -i email-infrastructure-key.pem ec2-user@3.144.233.205

# Check if role is attached
curl http://169.254.169.254/latest/meta-data/iam/security-credentials/

# Should return: EmailInfraEC2Role

# Test AWS credentials (if AWS CLI is installed)
aws sts get-caller-identity

# Should show your role ARN
```

## Security Best Practices

1. ✅ **Least Privilege**: Only grant permissions needed
2. ✅ **Resource-Level Permissions**: Limit to specific queues/logs
3. ✅ **No Access Keys**: Use IAM roles, not access keys
4. ✅ **Regular Review**: Audit permissions periodically
5. ✅ **Separate Roles**: Use different roles for different environments

## Troubleshooting

### "Access Denied" Errors

1. **Check Role Attachment**:
   ```bash
   curl http://169.254.169.254/latest/meta-data/iam/security-credentials/
   ```

2. **Verify Policy Permissions**: Check if resource ARNs match your queues

3. **Check Region**: Ensure policy region matches your resources

4. **Queue Names**: Verify queue names in policy match actual queue names

### Test SQS Access

```bash
# On EC2 instance, test SQS access
aws sqs list-queues --region us-east-2

# Should list your queues
```

## Next Steps

After creating the IAM role:
1. Attach it to your EC2 instance
2. Deploy your application
3. The application will automatically use the role credentials
4. No need to configure AWS_ACCESS_KEY_ID or AWS_SECRET_ACCESS_KEY

## Summary

✅ **IAM Role Name**: `EmailInfraEC2Role`  
✅ **Permissions**: SQS, CloudWatch Logs, Secrets Manager (optional)  
✅ **Security**: Least-privilege, resource-specific  
✅ **No Access Keys**: Uses instance profile automatically  

Your application will automatically use these credentials - no configuration needed!

