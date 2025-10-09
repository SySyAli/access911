#!/usr/bin/env python3
"""
Setup AWS Location Service for Geocoding
Creates a Place Index for converting location text to coordinates
"""
import boto3
import os
from dotenv import load_dotenv

load_dotenv()

REGION = os.getenv("AWS_REGION", "us-east-1")
INDEX_NAME = "elevenlabs-place-index"

print("="*80)
print("🌍 SETTING UP AWS LOCATION SERVICE")
print("="*80)

location_client = boto3.client('location', region_name=REGION)

# Step 1: Create Place Index
print(f"\n📍 Creating Place Index: {INDEX_NAME}")
print("-" * 80)

try:
    response = location_client.create_place_index(
        IndexName=INDEX_NAME,
        DataSource='Esri',  # Options: Esri, Here
        Description='Place index for geocoding emergency locations',
        PricingPlan='RequestBasedUsage'
    )

    print(f"✅ Place Index created successfully!")
    print(f"   Index Name: {INDEX_NAME}")
    print(f"   ARN: {response['IndexArn']}")
    print(f"   Data Source: Esri")

except location_client.exceptions.ConflictException:
    print(f"⚠️  Place Index '{INDEX_NAME}' already exists!")

    # Get existing index details
    response = location_client.describe_place_index(IndexName=INDEX_NAME)
    print(f"   Index Name: {response['IndexName']}")
    print(f"   ARN: {response['IndexArn']}")
    print(f"   Data Source: {response['DataSource']}")

except Exception as e:
    print(f"❌ Failed to create Place Index: {e}")
    exit(1)

# Step 2: Test geocoding
print(f"\n🧪 Testing geocoding...")
print("-" * 80)

test_locations = [
    "San Francisco, CA",
    "Nashville, Tennessee",
    "123 Main Street, New York, NY"
]

for location in test_locations:
    try:
        result = location_client.search_place_index_for_text(
            IndexName=INDEX_NAME,
            Text=location,
            MaxResults=1
        )

        if result['Results']:
            coords = result['Results'][0]['Place']['Geometry']['Point']
            label = result['Results'][0]['Place']['Label']
            print(f"✅ '{location}'")
            print(f"   → {label}")
            print(f"   → Lat: {coords[1]:.6f}, Lon: {coords[0]:.6f}")
        else:
            print(f"⚠️  No results for '{location}'")

    except Exception as e:
        print(f"❌ Error geocoding '{location}': {e}")

print("\n" + "="*80)
print("✅ AWS LOCATION SERVICE SETUP COMPLETE!")
print("="*80)
print(f"\n📝 Add this to your Lambda environment variables:")
print(f"   LOCATION_INDEX={INDEX_NAME}")
print(f"\n📝 Update Lambda IAM role to include these permissions:")
print("""
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "geo:SearchPlaceIndexForText"
      ],
      "Resource": "arn:aws:geo:us-east-1:*:place-index/elevenlabs-place-index"
    }
  ]
}
""")
print("="*80)
