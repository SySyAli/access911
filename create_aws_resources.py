#!/usr/bin/env python3
"""
Create AWS Resources - DynamoDB Table and S3 Bucket
Creates infrastructure needed for webhook storage
"""
import os
import boto3
from botocore.exceptions import ClientError
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

AWS_REGION = os.getenv("AWS_REGION")
AWS_ACCESS_KEY = os.getenv("AWS_ACCESS_KEY_ID")
AWS_SECRET_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")
AWS_SESSION_TOKEN = os.getenv("AWS_SESSION_TOKEN")
DYNAMODB_TABLE = os.getenv("DYNAMODB_TABLE_NAME")
S3_BUCKET = os.getenv("S3_BUCKET_NAME")

print("="*80)
print("🏗️  CREATING AWS RESOURCES")
print("="*80)

# Step 1: Create DynamoDB Table
print("\n📋 STEP 1: Creating DynamoDB Table")
print("-" * 80)

try:
    dynamodb = boto3.client(
        'dynamodb',
        aws_access_key_id=AWS_ACCESS_KEY,
        aws_secret_access_key=AWS_SECRET_KEY,
        aws_session_token=AWS_SESSION_TOKEN,
        region_name=AWS_REGION
    )

    print(f"Creating table: {DYNAMODB_TABLE}")
    print(f"Region: {AWS_REGION}")

    table = dynamodb.create_table(
        TableName=DYNAMODB_TABLE,
        KeySchema=[
            {
                'AttributeName': 'conversation_id',
                'KeyType': 'HASH'  # Partition key
            },
            {
                'AttributeName': 'timestamp',
                'KeyType': 'RANGE'  # Sort key
            }
        ],
        AttributeDefinitions=[
            {
                'AttributeName': 'conversation_id',
                'AttributeType': 'S'  # String
            },
            {
                'AttributeName': 'timestamp',
                'AttributeType': 'N'  # Number
            }
        ],
        BillingMode='PAY_PER_REQUEST'  # On-demand pricing
    )

    print(f"✅ Table creation initiated!")
    print(f"   Table Name: {DYNAMODB_TABLE}")
    print(f"   Status: Creating...")
    print(f"   Waiting for table to become active...")

    # Wait for table to be created
    waiter = dynamodb.get_waiter('table_exists')
    waiter.wait(TableName=DYNAMODB_TABLE)

    # Get table description
    response = dynamodb.describe_table(TableName=DYNAMODB_TABLE)
    print(f"✅ Table is now ACTIVE!")
    print(f"   ARN: {response['Table']['TableArn']}")
    print(f"   Item Count: {response['Table']['ItemCount']}")

except ClientError as e:
    if e.response['Error']['Code'] == 'ResourceInUseException':
        print(f"⚠️  Table '{DYNAMODB_TABLE}' already exists!")
    else:
        print(f"❌ Failed to create table: {e}")
        exit(1)

# Step 2: Create S3 Bucket
print("\n📋 STEP 2: Creating S3 Bucket")
print("-" * 80)

try:
    s3 = boto3.client(
        's3',
        aws_access_key_id=AWS_ACCESS_KEY,
        aws_secret_access_key=AWS_SECRET_KEY,
        aws_session_token=AWS_SESSION_TOKEN,
        region_name=AWS_REGION
    )

    print(f"Creating bucket: {S3_BUCKET}")
    print(f"Region: {AWS_REGION}")

    # Create bucket with location constraint for non-us-east-1 regions
    if AWS_REGION == 'us-east-1':
        s3.create_bucket(Bucket=S3_BUCKET)
    else:
        s3.create_bucket(
            Bucket=S3_BUCKET,
            CreateBucketConfiguration={'LocationConstraint': AWS_REGION}
        )

    print(f"✅ Bucket created successfully!")
    print(f"   Bucket: {S3_BUCKET}")
    print(f"   Region: {AWS_REGION}")

    # Enable versioning (optional but recommended)
    s3.put_bucket_versioning(
        Bucket=S3_BUCKET,
        VersioningConfiguration={'Status': 'Enabled'}
    )
    print(f"✅ Versioning enabled!")

except ClientError as e:
    if e.response['Error']['Code'] == 'BucketAlreadyOwnedByYou':
        print(f"⚠️  Bucket '{S3_BUCKET}' already exists and is owned by you!")
    elif e.response['Error']['Code'] == 'BucketAlreadyExists':
        print(f"❌ Bucket name '{S3_BUCKET}' is already taken by someone else!")
        print(f"   Please choose a different bucket name in .env")
        exit(1)
    else:
        print(f"❌ Failed to create bucket: {e}")
        exit(1)

# Summary
print("\n" + "="*80)
print("✅ AWS RESOURCES CREATED SUCCESSFULLY!")
print("="*80)
print(f"\nDynamoDB Table: {DYNAMODB_TABLE}")
print(f"   - Primary Key: conversation_id (String)")
print(f"   - Sort Key: timestamp (Number)")
print(f"   - Billing: Pay-per-request")
print(f"\nS3 Bucket: {S3_BUCKET}")
print(f"   - Region: {AWS_REGION}")
print(f"   - Versioning: Enabled")
print(f"\n✅ Ready to integrate with webhook_server.py!")
print("="*80)