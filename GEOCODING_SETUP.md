# Geocoding Setup Guide

This guide shows how to add AWS Location Service geocoding to your Lambda function.

## What This Fixes

**Problem:** ElevenLabs extracts location text (e.g., "Nashville, TN") but can't always provide latitude/longitude coordinates.

**Solution:** When coordinates are missing (0.0, 0.0), the Lambda automatically geocodes the location text using AWS Location Service.

## Setup Steps

### 1. Create AWS Location Service Place Index

Run the setup script:

```bash
python setup_geocoding.py
```

This creates a Place Index named `elevenlabs-place-index` that uses Esri data for geocoding.

**Expected output:**
```
✅ Place Index created successfully!
   Index Name: elevenlabs-place-index
   ARN: arn:aws:geo:us-east-1:...:place-index/elevenlabs-place-index
   Data Source: Esri
```

### 2. Update Lambda IAM Role

Your Lambda needs permission to access the Location Service.

**Option A: Via AWS Console**

1. Go to AWS Lambda Console → `elevenlabs-webhook-handler`
2. Configuration → Permissions
3. Click on the Role name
4. Add permissions → Attach policies → Create policy
5. Use JSON editor and paste contents of `lambda-geocoding-policy.json`
6. Name it: `ElevenLabsLambdaPolicy`
7. Attach to your Lambda role

**Option B: Via AWS CLI**

```bash
# Create the policy
aws iam create-policy \
  --policy-name ElevenLabsLambdaPolicy \
  --policy-document file://lambda-geocoding-policy.json

# Get your Lambda's role name
ROLE_NAME=$(aws lambda get-function --function-name elevenlabs-webhook-handler \
  --query 'Configuration.Role' --output text | cut -d'/' -f2)

# Attach the policy to the role
aws iam attach-role-policy \
  --role-name $ROLE_NAME \
  --policy-arn arn:aws:iam::YOUR_ACCOUNT_ID:policy/ElevenLabsLambdaPolicy
```

### 3. Update Lambda Environment Variables

Add the Location Index name to your Lambda:

```bash
aws lambda update-function-configuration \
  --function-name elevenlabs-webhook-handler \
  --environment Variables={
    DYNAMODB_TABLE=elevenlabs-call-data,
    S3_BUCKET=elevenlabs-webhooks,
    WEBHOOK_SECRET=your_secret_here,
    LOCATION_INDEX=elevenlabs-place-index
  }
```

**Or via AWS Console:**
1. Lambda → `elevenlabs-webhook-handler` → Configuration → Environment variables
2. Add: `LOCATION_INDEX` = `elevenlabs-place-index`

### 4. Deploy Updated Lambda Code

```bash
# Zip the updated code
zip -r lambda.zip eleven_labs_lambda.py

# Update Lambda
aws lambda update-function-code \
  --function-name elevenlabs-webhook-handler \
  --zip-file fileb://lambda.zip
```

## How It Works

### Before (without geocoding):
```python
# ElevenLabs data:
location: "Nashville, TN"
latitude: 0.0  ❌
longitude: 0.0  ❌
```

### After (with geocoding):
```python
# ElevenLabs data:
location: "Nashville, TN"
latitude: 0.0  # Missing from ElevenLabs

# Lambda automatically geocodes:
🔍 ElevenLabs coordinates missing, attempting geocoding...
🌍 Geocoding location: 'Nashville, TN'
✅ Geocoded 'Nashville, TN' → lat: 36.1627, lon: -86.7816

# Final metadata:
location: "Nashville, TN"
latitude: 36.1627  ✅
longitude: -86.7816  ✅
```

## Code Flow

```python
def extract_metadata_from_elevenlabs(analysis):
    # 1. Extract location text from ElevenLabs
    location_text = "Nashville, TN"
    latitude = 0.0  # Missing
    longitude = 0.0  # Missing

    # 2. Check if coordinates are missing
    if (latitude == 0.0 or longitude == 0.0) and location_text != 'unknown':
        # 3. Geocode the location text
        latitude, longitude = geocode_location(location_text)
        # Returns: (36.1627, -86.7816)

    # 4. Return complete metadata
    return {
        'location': location_text,
        'latitude': latitude,
        'longitude': longitude,
        ...
    }
```

## Testing

Test with a webhook that has location text but no coordinates:

```bash
curl -X POST https://962qqr5f50.execute-api.us-east-1.amazonaws.com/elevenlabs-webhook-handler \
  -H "Content-Type: application/json" \
  -d '{
    "type": "post_call_transcription",
    "event_timestamp": '$(date +%s)',
    "data": {
      "conversation_id": "geocoding_test_'$(date +%s)'",
      "agent_id": "test",
      "analysis": {
        "transcript_summary": "Test geocoding",
        "call_successful": "yes",
        "data_collection_results": {
          "emergency_type": {"value": "wildfire"},
          "location": {"value": "San Francisco, California"},
          "severity": {"value": "high"}
        }
      },
      "metadata": {"call_duration_secs": 30}
    }
  }'
```

Check CloudWatch logs:
```bash
aws logs tail /aws/lambda/elevenlabs-webhook-handler \
  --region us-east-1 \
  --since 5m \
  --format short \
  --follow
```

**Expected logs:**
```
🔍 ElevenLabs coordinates missing, attempting geocoding...
🌍 Geocoding location: 'San Francisco, California'
✅ Geocoded 'San Francisco, California' → lat: 37.7749, lon: -122.4194
```

## Pricing

AWS Location Service pricing (as of 2024):
- **Geocoding (SearchPlaceIndexForText):** $0.50 per 1,000 requests
- **First 5,000 requests/month:** FREE

For most use cases, this will cost pennies per month.

## Troubleshooting

### Error: "ResourceNotFoundException: Place index not found"
- Run `python setup_geocoding.py` to create the index
- Verify the index exists: `aws location list-place-indexes`

### Error: "AccessDeniedException"
- Lambda IAM role missing permissions
- Attach the policy from `lambda-geocoding-policy.json`

### Geocoding returns 0.0, 0.0
- Location text is too vague (e.g., "downtown")
- Try providing more specific location strings from ElevenLabs
- Check CloudWatch logs for geocoding errors

### Alternative: Use Different Data Source
If Esri doesn't work well for your locations, try HERE:

```python
location_client.create_place_index(
    IndexName='elevenlabs-place-index-here',
    DataSource='Here',  # Instead of Esri
    PricingPlan='RequestBasedUsage'
)
```

## Monitoring

View geocoding activity:

```bash
# See all geocoding attempts
aws logs tail /aws/lambda/elevenlabs-webhook-handler \
  --region us-east-1 \
  --since 1h \
  --format short | grep -i geocod
```

Query DynamoDB for records with coordinates:

```bash
aws dynamodb scan \
  --table-name elevenlabs-call-data \
  --filter-expression "latitude <> :zero" \
  --expression-attribute-values '{":zero":{"N":"0"}}' \
  --projection-expression "conversation_id,location,latitude,longitude"
```
