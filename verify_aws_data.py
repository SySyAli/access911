#!/usr/bin/env python3
"""
Verify data was saved to DynamoDB and S3
"""
import os
import boto3
from dotenv import load_dotenv
import json

load_dotenv()

AWS_REGION = os.getenv("AWS_REGION")
AWS_ACCESS_KEY = os.getenv("AWS_ACCESS_KEY_ID")
AWS_SECRET_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")
AWS_SESSION_TOKEN = os.getenv("AWS_SESSION_TOKEN")
DYNAMODB_TABLE = os.getenv("DYNAMODB_TABLE_NAME")
S3_BUCKET = os.getenv("S3_BUCKET_NAME")

print("="*80)
print("🔍 VERIFYING AWS DATA")
print("="*80)

# Check DynamoDB
print("\n📊 DynamoDB Table Contents:")
print("-" * 80)

dynamodb = boto3.resource(
    'dynamodb',
    aws_access_key_id=AWS_ACCESS_KEY,
    aws_secret_access_key=AWS_SECRET_KEY,
    aws_session_token=AWS_SESSION_TOKEN,
    region_name=AWS_REGION
)

table = dynamodb.Table(DYNAMODB_TABLE)
response = table.scan()
items = response['Items']

print(f"Total items: {len(items)}")
for item in items:
    print(f"\n  Conversation: {item.get('conversation_id')}")
    print(f"  Timestamp: {item.get('timestamp')}")
    print(f"  Agent: {item.get('agent_id')}")
    print(f"  Summary: {item.get('summary', '')[:100]}...")
    print(f"  Success: {item.get('call_successful')}")
    print(f"  Duration: {item.get('duration_secs')}s")

# Check S3
print("\n\n☁️  S3 Bucket Contents:")
print("-" * 80)

s3 = boto3.client(
    's3',
    aws_access_key_id=AWS_ACCESS_KEY,
    aws_secret_access_key=AWS_SECRET_KEY,
    aws_session_token=AWS_SESSION_TOKEN,
    region_name=AWS_REGION
)

response = s3.list_objects_v2(Bucket=S3_BUCKET)
if 'Contents' in response:
    print(f"Total objects: {len(response['Contents'])}")
    for obj in response['Contents']:
        print(f"\n  Key: {obj['Key']}")
        print(f"  Size: {obj['Size']} bytes")
        print(f"  Last Modified: {obj['LastModified']}")
else:
    print("  Bucket is empty")

print("\n" + "="*80)
print("✅ VERIFICATION COMPLETE")
print("="*80)