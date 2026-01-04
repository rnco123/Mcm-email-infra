#!/bin/bash

# EC2 Deployment Script for Email Infrastructure API
# This script sets up the application on an EC2 instance

set -e

echo "🚀 Starting Email Infrastructure API Deployment..."

# Check if running on Amazon Linux
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$ID
else
    echo "❌ Cannot detect OS. This script is designed for Amazon Linux or Ubuntu."
    exit 1
fi

# Install Node.js 20
echo "📦 Installing Node.js 20..."
if [ "$OS" = "amzn" ]; then
    # Amazon Linux
    curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
    sudo yum install -y nodejs
elif [ "$OS" = "ubuntu" ]; then
    # Ubuntu
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
else
    echo "❌ Unsupported OS: $OS"
    exit 1
fi

# Verify Node.js installation
node --version
npm --version

# Install PM2 globally
echo "📦 Installing PM2..."
sudo npm install -g pm2

# Install PostgreSQL client (optional, for migrations)
echo "📦 Installing PostgreSQL client..."
if [ "$OS" = "amzn" ]; then
    sudo yum install -y postgresql15
elif [ "$OS" = "ubuntu" ]; then
    sudo apt-get install -y postgresql-client
fi

# Clone or update repository
if [ -d "Mcm-email-infra" ]; then
    echo "📥 Updating repository..."
    cd Mcm-email-infra
    git pull
else
    echo "📥 Cloning repository..."
    git clone https://github.com/rnco123/Mcm-email-infra.git
    cd Mcm-email-infra
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build application
echo "🔨 Building application..."
npm run build

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚠️  Warning: .env file not found!"
    echo "📝 Please create .env file with required environment variables:"
    echo "   - ENCRYPTION_KEY (required for HIPAA)"
    echo "   - DATABASE_HOST"
    echo "   - DATABASE_USER"
    echo "   - DATABASE_PASSWORD"
    echo "   - DATABASE_NAME"
    echo "   - AWS_SQS_EMAIL_QUEUE_URL"
    echo "   - AWS_SQS_BROADCAST_QUEUE_URL"
    echo "   - AWS_REGION"
    echo ""
    read -p "Press Enter to continue after setting up .env file..."
fi

# Stop existing PM2 process if running
pm2 delete email-api 2>/dev/null || true

# Start application with PM2
echo "🚀 Starting application with PM2..."
pm2 start dist/main.js --name email-api --log-date-format "YYYY-MM-DD HH:mm:ss Z"

# Save PM2 configuration
pm2 save

# Set up PM2 to start on boot
echo "⚙️  Setting up PM2 startup script..."
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u $USER --hp $HOME

# Show PM2 status
echo "📊 Application status:"
pm2 status

# Show logs
echo "📋 Recent logs:"
pm2 logs email-api --lines 20 --nostream

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📝 Useful commands:"
echo "   pm2 status              - Check application status"
echo "   pm2 logs email-api      - View logs"
echo "   pm2 restart email-api   - Restart application"
echo "   pm2 stop email-api      - Stop application"
echo ""
echo "🌐 Application should be running on port 3000"
echo "   Make sure security group allows traffic on port 3000 (or configure reverse proxy)"

