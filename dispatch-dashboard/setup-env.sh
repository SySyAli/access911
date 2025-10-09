#!/bin/bash

# Script to help set up AWS credentials for DynamoDB integration

echo "🔧 DynamoDB Integration Setup"
echo "=============================="
echo ""

# Check if .env.local already exists
if [ -f .env.local ]; then
    echo "⚠️  .env.local already exists!"
    read -p "Do you want to overwrite it? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Setup cancelled."
        exit 0
    fi
fi

echo "Please enter your AWS credentials:"
echo ""

# Get AWS Access Key ID
read -p "AWS Access Key ID: " aws_access_key
echo ""

# Get AWS Secret Access Key (hidden input)
read -s -p "AWS Secret Access Key: " aws_secret_key
echo ""
echo ""

# Get AWS Region (default to us-east-1)
read -p "AWS Region [us-east-1]: " aws_region
aws_region=${aws_region:-us-east-1}
echo ""

# Get Table Name (default to elevenlabs-call-data)
read -p "DynamoDB Table Name [elevenlabs-call-data]: " table_name
table_name=${table_name:-elevenlabs-call-data}
echo ""

# Create .env.local file
cat > .env.local << EOF
# AWS Configuration
AWS_REGION=$aws_region
AWS_ACCESS_KEY_ID=$aws_access_key
AWS_SECRET_ACCESS_KEY=$aws_secret_key

# DynamoDB Table
DYNAMODB_TABLE_NAME=$table_name
EOF

echo "✅ .env.local file created successfully!"
echo ""
echo "Your dashboard is now configured to use DynamoDB table: $table_name"
echo ""
echo "Next steps:"
echo "1. Start your development server: npm run dev"
echo "2. Open http://localhost:3000"
echo "3. Check the console for any connection errors"
echo ""
echo "📖 For more information, see DYNAMODB_SETUP.md"

