#!/bin/bash
# Deploy Geocoding-Enabled Lambda
# This script sets up AWS Location Service and deploys the updated Lambda

set -e  # Exit on error

FUNCTION_NAME="elevenlabs-webhook-handler"
REGION="us-east-1"
INDEX_NAME="elevenlabs-place-index"

echo "=========================================="
echo "🚀 DEPLOYING GEOCODING TO LAMBDA"
echo "=========================================="

# Step 1: Create Place Index
echo ""
echo "Step 1: Creating AWS Location Service Place Index..."
python setup_geocoding.py

# Step 2: Package Lambda code
echo ""
echo "Step 2: Packaging Lambda code..."
cd "$(dirname "$0")"
zip -q lambda.zip eleven_labs_lambda.py
echo "✅ Created lambda.zip"

# Step 3: Update Lambda code
echo ""
echo "Step 3: Deploying to Lambda..."
aws lambda update-function-code \
  --function-name $FUNCTION_NAME \
  --region $REGION \
  --zip-file fileb://lambda.zip \
  --output json | jq -r '.LastModified, .State'

echo "✅ Lambda code updated"

# Step 4: Update environment variables
echo ""
echo "Step 4: Setting environment variables..."

# Get current env vars
CURRENT_ENV=$(aws lambda get-function-configuration \
  --function-name $FUNCTION_NAME \
  --region $REGION \
  --query 'Environment.Variables' \
  --output json)

# Add LOCATION_INDEX to existing vars
UPDATED_ENV=$(echo $CURRENT_ENV | jq --arg idx "$INDEX_NAME" '. + {LOCATION_INDEX: $idx}')

aws lambda update-function-configuration \
  --function-name $FUNCTION_NAME \
  --region $REGION \
  --environment "Variables=$UPDATED_ENV" \
  --output json | jq -r '.Environment.Variables.LOCATION_INDEX'

echo "✅ Environment variables updated"

# Step 5: Check IAM permissions
echo ""
echo "Step 5: Checking IAM permissions..."
ROLE_ARN=$(aws lambda get-function-configuration \
  --function-name $FUNCTION_NAME \
  --region $REGION \
  --query 'Role' \
  --output text)

ROLE_NAME=$(echo $ROLE_ARN | cut -d'/' -f2)

echo "Lambda Role: $ROLE_NAME"
echo ""
echo "⚠️  IMPORTANT: Ensure your Lambda role has Location Service permissions!"
echo "   Run this command to attach the policy:"
echo ""
echo "   aws iam put-role-policy \\"
echo "     --role-name $ROLE_NAME \\"
echo "     --policy-name GeocodingPolicy \\"
echo "     --policy-document file://lambda-geocoding-policy.json"
echo ""

# Cleanup
rm -f lambda.zip

echo "=========================================="
echo "✅ DEPLOYMENT COMPLETE!"
echo "=========================================="
echo ""
echo "🧪 Test with:"
echo "   curl -X POST https://962qqr5f50.execute-api.us-east-1.amazonaws.com/elevenlabs-webhook-handler \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"type\":\"post_call_transcription\",\"event_timestamp\":$(date +%s),\"data\":{\"conversation_id\":\"test_geo_$(date +%s)\",\"agent_id\":\"test\",\"analysis\":{\"transcript_summary\":\"Test\",\"call_successful\":\"yes\",\"data_collection_results\":{\"emergency_type\":{\"value\":\"wildfire\"},\"location\":{\"value\":\"San Francisco, CA\"},\"severity\":{\"value\":\"high\"}}},\"metadata\":{\"call_duration_secs\":30}}}'"
echo ""
echo "📊 Monitor logs:"
echo "   aws logs tail /aws/lambda/$FUNCTION_NAME --region $REGION --follow"
echo ""
