#!/usr/bin/env python3
"""
Test AWS Connectivity - DynamoDB and S3
Tests each component incrementally with tons of logging
"""
import os
import boto3
from botocore.exceptions import ClientError, NoCredentialsError
from dotenv import load_dotenv
import json
from datetime import datetime

# Load environment variables
load_dotenv()

print("="*80)
print("🧪 AWS CONNECTIVITY TEST")
print("="*80)

# Step 1: Check Environment Variables
print("\n📋 STEP 1: Checking Environment Variables")
print("-" * 80)

AWS_REGION = os.getenv("AWS_REGION")
AWS_ACCESS_KEY = os.getenv("AWS_ACCESS_KEY_ID")
AWS_SECRET_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")
AWS_SESSION_TOKEN = os.getenv("AWS_SESSION_TOKEN")
DYNAMODB_TABLE = os.getenv("DYNAMODB_TABLE_NAME")
S3_BUCKET = os.getenv("S3_BUCKET_NAME")

print(f"✓ AWS_REGION: {AWS_REGION if AWS_REGION else '❌ MISSING'}")
print(f"✓ AWS_ACCESS_KEY_ID: {'***' + AWS_ACCESS_KEY[-4:] if AWS_ACCESS_KEY else '❌ MISSING'}")
print(f"✓ AWS_SECRET_ACCESS_KEY: {'***' + AWS_SECRET_KEY[-4:] if AWS_SECRET_KEY else '❌ MISSING'}")
print(f"✓ AWS_SESSION_TOKEN: {'***' + AWS_SESSION_TOKEN[-4:] if AWS_SESSION_TOKEN else '❌ MISSING'}")
print(f"✓ DYNAMODB_TABLE_NAME: {DYNAMODB_TABLE if DYNAMODB_TABLE else '❌ MISSING'}")
print(f"✓ S3_BUCKET_NAME: {S3_BUCKET if S3_BUCKET else '❌ MISSING'}")

if not all([AWS_REGION, AWS_ACCESS_KEY, AWS_SECRET_KEY, DYNAMODB_TABLE, S3_BUCKET]):
    print("\n❌ FAILED: Missing required environment variables!")
    exit(1)

print("\n✅ All environment variables present")

# Step 2: Test AWS Credentials
print("\n📋 STEP 2: Testing AWS Credentials")
print("-" * 80)

try:
    sts_client = boto3.client(
        'sts',
        aws_access_key_id=AWS_ACCESS_KEY,
        aws_secret_access_key=AWS_SECRET_KEY,
        aws_session_token=AWS_SESSION_TOKEN,
        region_name=AWS_REGION
    )

    identity = sts_client.get_caller_identity()
    print(f"✅ AWS Credentials Valid!")
    print(f"   Account: {identity['Account']}")
    print(f"   User ARN: {identity['Arn']}")
    print(f"   User ID: {identity['UserId']}")
except NoCredentialsError:
    print("❌ FAILED: No credentials found!")
    exit(1)
except ClientError as e:
    print(f"❌ FAILED: {e}")
    exit(1)

# Step 3: Test DynamoDB Connection
print("\n📋 STEP 3: Testing DynamoDB Connection")
print("-" * 80)

try:
    dynamodb = boto3.resource(
        'dynamodb',
        aws_access_key_id=AWS_ACCESS_KEY,
        aws_secret_access_key=AWS_SECRET_KEY,
        aws_session_token=AWS_SESSION_TOKEN,
        region_name=AWS_REGION
    )

    print(f"✅ DynamoDB client created")
    print(f"   Region: {AWS_REGION}")

    # List all tables
    dynamodb_client = boto3.client(
        'dynamodb',
        aws_access_key_id=AWS_ACCESS_KEY,
        aws_secret_access_key=AWS_SECRET_KEY,
        aws_session_token=AWS_SESSION_TOKEN,
        region_name=AWS_REGION
    )

    tables = dynamodb_client.list_tables()
    print(f"   Existing tables: {tables['TableNames']}")

    # Check if our table exists
    if DYNAMODB_TABLE in tables['TableNames']:
        print(f"✅ Table '{DYNAMODB_TABLE}' exists!")

        # Get table details
        table = dynamodb.Table(DYNAMODB_TABLE)
        print(f"   Table status: {table.table_status}")
        print(f"   Item count: {table.item_count}")
    else:
        print(f"⚠️  Table '{DYNAMODB_TABLE}' does not exist yet (will create later)")

except ClientError as e:
    print(f"❌ FAILED: {e}")
    exit(1)

# Step 4: Test S3 Connection
print("\n📋 STEP 4: Testing S3 Connection")
print("-" * 80)

try:
    s3_client = boto3.client(
        's3',
        aws_access_key_id=AWS_ACCESS_KEY,
        aws_secret_access_key=AWS_SECRET_KEY,
        aws_session_token=AWS_SESSION_TOKEN,
        region_name=AWS_REGION
    )

    print(f"✅ S3 client created")

    # List all buckets
    buckets = s3_client.list_buckets()
    bucket_names = [b['Name'] for b in buckets['Buckets']]
    print(f"   Your buckets: {bucket_names}")

    # Check if our bucket exists
    if S3_BUCKET in bucket_names:
        print(f"✅ Bucket '{S3_BUCKET}' exists!")

        # Try to list objects
        try:
            objects = s3_client.list_objects_v2(Bucket=S3_BUCKET, MaxKeys=5)
            if 'Contents' in objects:
                print(f"   Object count: {len(objects['Contents'])} (showing first 5)")
            else:
                print(f"   Bucket is empty")
        except ClientError as e:
            print(f"   Could not list objects: {e}")
    else:
        print(f"⚠️  Bucket '{S3_BUCKET}' does not exist yet (will create later)")

except ClientError as e:
    print(f"❌ FAILED: {e}")
    exit(1)

# Step 5: Test Write Operations (if table/bucket exist)
print("\n📋 STEP 5: Testing Write Operations")
print("-" * 80)

# Test DynamoDB Write
if DYNAMODB_TABLE in tables['TableNames']:
    try:
        table = dynamodb.Table(DYNAMODB_TABLE)
        test_item = {
            'conversation_id': 'test_' + datetime.now().strftime('%Y%m%d_%H%M%S'),
            'timestamp': int(datetime.now().timestamp()),
            'summary': 'This is a test entry from test_aws_connection.py',
            'agent_id': 'test_agent',
            'call_successful': 'success',
            'test': True
        }

        print(f"📝 Writing test item to DynamoDB...")
        table.put_item(Item=test_item)
        print(f"✅ Successfully wrote to DynamoDB!")
        print(f"   Item: {test_item['conversation_id']}")

        # Try to read it back
        response = table.get_item(Key={
            'conversation_id': test_item['conversation_id'],
            'timestamp': test_item['timestamp']
        })
        if 'Item' in response:
            print(f"✅ Successfully read back from DynamoDB!")

    except ClientError as e:
        print(f"⚠️  DynamoDB write test failed: {e}")
else:
    print(f"⏭️  Skipping DynamoDB write test (table doesn't exist yet)")

# Test S3 Write
if S3_BUCKET in bucket_names:
    try:
        test_data = {
            'test': True,
            'message': 'Test upload from test_aws_connection.py',
            'timestamp': datetime.now().isoformat()
        }
        test_key = f"test/test_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"

        print(f"\n📝 Writing test file to S3...")
        s3_client.put_object(
            Bucket=S3_BUCKET,
            Key=test_key,
            Body=json.dumps(test_data, indent=2),
            ContentType='application/json'
        )
        print(f"✅ Successfully wrote to S3!")
        print(f"   S3 URI: s3://{S3_BUCKET}/{test_key}")

        # Try to read it back
        obj = s3_client.get_object(Bucket=S3_BUCKET, Key=test_key)
        content = obj['Body'].read().decode('utf-8')
        print(f"✅ Successfully read back from S3!")

    except ClientError as e:
        print(f"⚠️  S3 write test failed: {e}")
else:
    print(f"⏭️  Skipping S3 write test (bucket doesn't exist yet)")

# Summary
print("\n" + "="*80)
print("✅ AWS CONNECTIVITY TEST COMPLETE")
print("="*80)
print("\nNext steps:")
if DYNAMODB_TABLE not in tables['TableNames']:
    print(f"  1. Create DynamoDB table: {DYNAMODB_TABLE}")
if S3_BUCKET not in bucket_names:
    print(f"  2. Create S3 bucket: {S3_BUCKET}")
print(f"  3. Update webhook_server.py with AWS integration")
print("="*80)