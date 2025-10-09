# Geocoding Implementation Summary

## 🎯 Problem Solved

**Issue:** ElevenLabs can extract location text (e.g., "Nashville, TN") from calls, but often can't provide latitude/longitude coordinates, resulting in `0.0, 0.0` in your DynamoDB table.

**Solution:** Added AWS Location Service geocoding that automatically converts location text to coordinates when ElevenLabs doesn't provide them.

## 📝 Changes Made

### 1. Updated Lambda Code (`eleven_labs_lambda.py`)

**Added:**
- AWS Location Service client initialization
- `geocode_location()` function - converts text to coordinates
- Automatic geocoding when coordinates are missing

**Code Flow:**
```python
# Before (line 31-32):
'latitude': float(get_value(data_collection.get('latitude'), 0.0)),  # Always 0.0
'longitude': float(get_value(data_collection.get('longitude'), 0.0)),  # Always 0.0

# After (line 63-71):
latitude = float(get_value(data_collection.get('latitude'), 0.0))
longitude = float(get_value(data_collection.get('longitude'), 0.0))

# If missing, geocode the location text
if (latitude == 0.0 or longitude == 0.0) and location_text != 'unknown':
    latitude, longitude = geocode_location(location_text)  # ✅ Real coordinates!
```

### 2. Created Setup Files

| File | Purpose |
|------|---------|
| `setup_geocoding.py` | Creates AWS Location Service Place Index |
| `deploy_geocoding.sh` | One-command deployment script |
| `lambda-geocoding-policy.json` | IAM permissions for Lambda |
| `GEOCODING_SETUP.md` | Detailed setup instructions |

## 🚀 Quick Start (3 Steps)

### Step 1: Setup AWS Location Service
```bash
python setup_geocoding.py
```

### Step 2: Deploy to Lambda
```bash
./deploy_geocoding.sh
```

### Step 3: Add IAM Permissions
```bash
# Get your Lambda role name
ROLE_NAME=$(aws lambda get-function-configuration \
  --function-name elevenlabs-webhook-handler \
  --region us-east-1 \
  --query 'Role' \
  --output text | cut -d'/' -f2)

# Add geocoding permissions
aws iam put-role-policy \
  --role-name $ROLE_NAME \
  --policy-name GeocodingPolicy \
  --policy-document file://lambda-geocoding-policy.json
```

## ✅ What You'll See

### Before Geocoding:
```json
{
  "conversation_id": "call_12345",
  "location": "Nashville, TN",
  "latitude": 0.0,  ❌
  "longitude": 0.0   ❌
}
```

### After Geocoding:
```json
{
  "conversation_id": "call_12345",
  "location": "Nashville, TN",
  "latitude": 36.1627,  ✅
  "longitude": -86.7816  ✅
}
```

### CloudWatch Logs:
```
🔍 ElevenLabs coordinates missing, attempting geocoding...
🌍 Geocoding location: 'Nashville, TN'
✅ Geocoded 'Nashville, TN' → lat: 36.1627, lon: -86.7816
✅ Saved to DynamoDB: call_12345
```

## 💰 Costs

AWS Location Service pricing:
- **$0.50 per 1,000 geocoding requests**
- **First 5,000 requests/month: FREE**

Example: 100 calls/month = **$0 (free tier)**

## 🧪 Testing

### Test Command:
```bash
curl -X POST https://962qqr5f50.execute-api.us-east-1.amazonaws.com/elevenlabs-webhook-handler \
  -H "Content-Type: application/json" \
  -d '{
    "type": "post_call_transcription",
    "event_timestamp": '$(date +%s)',
    "data": {
      "conversation_id": "test_geo_'$(date +%s)'",
      "agent_id": "test",
      "analysis": {
        "data_collection_results": {
          "location": {"value": "San Francisco, CA"}
        }
      },
      "metadata": {"call_duration_secs": 30}
    }
  }'
```

### Monitor Logs:
```bash
aws logs tail /aws/lambda/elevenlabs-webhook-handler \
  --region us-east-1 \
  --follow \
  | grep -E "(Geocoding|lat:|lon:)"
```

### Check DynamoDB:
```bash
aws dynamodb scan \
  --table-name elevenlabs-call-data \
  --filter-expression "latitude <> :zero" \
  --expression-attribute-values '{":zero":{"N":"0"}}' \
  --projection-expression "conversation_id,location,latitude,longitude" \
  --max-items 5
```

## 🔍 How It Works

```
┌─────────────────────────────────────────────────────────────┐
│ 1. ElevenLabs Webhook Arrives                               │
│    location: "Nashville, TN"                                │
│    latitude: null                                           │
│    longitude: null                                          │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. extract_metadata_from_elevenlabs()                       │
│    - Extracts location: "Nashville, TN"                     │
│    - Checks: latitude == 0.0? YES ❌                        │
│    - Triggers geocoding                                     │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. geocode_location("Nashville, TN")                        │
│    - Calls AWS Location Service                            │
│    - Search Esri place index                                │
│    - Returns: (36.1627, -86.7816) ✅                        │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. save_to_dynamodb()                                       │
│    conversation_id: "call_12345"                            │
│    location: "Nashville, TN"                                │
│    latitude: 36.1627  ✅                                    │
│    longitude: -86.7816  ✅                                  │
└─────────────────────────────────────────────────────────────┘
```

## 📚 Files Reference

- **`eleven_labs_lambda.py`** - Updated Lambda with geocoding
- **`setup_geocoding.py`** - Creates AWS Location Place Index
- **`deploy_geocoding.sh`** - Deploy everything at once
- **`lambda-geocoding-policy.json`** - IAM permissions
- **`GEOCODING_SETUP.md`** - Full setup guide
- **`GEOCODING_SUMMARY.md`** - This file

## ⚠️ Important Notes

1. **Signature Verification**: Your CloudWatch logs show signature verification failing. This is because test curl requests don't include the `elevenlabs-signature` header. Real ElevenLabs webhooks will include this.

2. **Fallback Behavior**: If geocoding fails (bad location text, network error), it falls back to `0.0, 0.0` and logs the error. Your data still gets saved.

3. **Performance**: Geocoding adds ~100-200ms latency per request. Only triggers when ElevenLabs doesn't provide coordinates.

## 🐛 Troubleshooting

| Error | Solution |
|-------|----------|
| `ResourceNotFoundException: Place index not found` | Run `python setup_geocoding.py` |
| `AccessDeniedException` | Add IAM policy: `aws iam put-role-policy ...` |
| Still getting `0.0, 0.0` | Check logs for geocoding errors |
| Signature verification failed | Normal for test curls - ElevenLabs webhooks will work |

## 🎉 Next Steps

1. **Deploy:** Run `./deploy_geocoding.sh`
2. **Test:** Send a webhook with location text
3. **Monitor:** Watch CloudWatch logs for geocoding activity
4. **Verify:** Check DynamoDB for real coordinates

---

**Questions?** Check `GEOCODING_SETUP.md` for detailed instructions.
