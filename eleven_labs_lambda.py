import json
import boto3
import os
import hmac
from hashlib import sha256
import time
from datetime import datetime
from decimal import Decimal

# Initialize AWS clients
dynamodb = boto3.resource('dynamodb')
s3_client = boto3.client('s3')

# Environment variables (set in Lambda configuration)
DYNAMODB_TABLE = os.environ.get('DYNAMODB_TABLE', 'elevenlabs-call-data')
S3_BUCKET = os.environ.get('S3_BUCKET', 'elevenlabs-webhooks')
WEBHOOK_SECRET = os.environ.get('WEBHOOK_SECRET', '')

def extract_metadata_from_elevenlabs(analysis):
    """Extract metadata from ElevenLabs data_collection_results"""
    data_collection = analysis.get('data_collection_results', {})
    
    def get_value(field_data, default):
        if isinstance(field_data, dict):
            return field_data.get('value', default)
        return field_data if field_data is not None else default
    
    metadata = {
        'emergency_type': get_value(data_collection.get('emergency_type'), 'unknown'),
        'location': get_value(data_collection.get('location'), 'unknown'),
        'latitude': float(get_value(data_collection.get('latitude'), 0.0)),
        'longitude': float(get_value(data_collection.get('longitude'), 0.0)),
        'severity': get_value(data_collection.get('severity'), 'unknown')
    }
    
    print(f"Extracted metadata: {metadata}")
    return metadata

def verify_signature(body, signature_header):
    """Verify ElevenLabs webhook signature"""
    if not WEBHOOK_SECRET or not signature_header:
        return True  # Skip verification if not configured
    
    try:
        # Parse signature header
        parts = signature_header.split(",")
        timestamp = None
        signature = None
        
        for part in parts:
            if part.startswith("t="):
                timestamp = part[2:]
            elif part.startswith("v0="):
                signature = part
        
        if not timestamp or not signature:
            return False
        
        # Check timestamp (within 30 minutes)
        req_timestamp = int(timestamp) * 1000
        tolerance = int(time.time() * 1000) - (30 * 60 * 1000)
        if req_timestamp <= tolerance:
            print("Signature timestamp too old")
            return False
        
        # Verify signature
        message = f"{timestamp}.{body}"
        expected_digest = 'v0=' + hmac.new(
            key=WEBHOOK_SECRET.encode("utf-8"),
            msg=message.encode("utf-8"),
            digestmod=sha256
        ).hexdigest()
        
        return hmac.compare_digest(signature, expected_digest)
        
    except Exception as e:
        print(f"Signature verification error: {e}")
        return False

def save_to_dynamodb(conversation_id, timestamp, call_data, analysis, metadata):
    """Save call data to DynamoDB"""
    try:
        table = dynamodb.Table(DYNAMODB_TABLE)
        
        item = {
            'conversation_id': conversation_id,
            'timestamp': int(timestamp),
            'agent_id': call_data.get('agent_id', ''),
            'summary': analysis.get('transcript_summary', ''),
            'call_successful': analysis.get('call_successful', ''),
            'duration_secs': call_data.get('metadata', {}).get('call_duration_secs', 0),
            'transcript_length': len(call_data.get('transcript', [])),
            'created_at': datetime.now().isoformat()
        }
        
        # Add extracted metadata
        if metadata:
            item['emergency_type'] = metadata.get('emergency_type', 'unknown')
            item['location'] = metadata.get('location', 'unknown')
            item['latitude'] = Decimal(str(metadata.get('latitude', 0.0)))
            item['longitude'] = Decimal(str(metadata.get('longitude', 0.0)))
            item['severity'] = metadata.get('severity', 'unknown')
        
        table.put_item(Item=item)
        print(f"✅ Saved to DynamoDB: {conversation_id}")
        return True
        
    except Exception as e:
        print(f"❌ DynamoDB error: {e}")
        return False

def save_to_s3(conversation_id, data):
    """Save full call data to S3"""
    try:
        s3_key = f"calls/{conversation_id}/{conversation_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"

        # Convert to JSON string
        json_data = json.dumps(data, indent=2, default=str)

        print(f"\n📝 Writing object to S3: s3://{S3_BUCKET}/{s3_key}...")
        s3_client.put_object(
            Bucket=S3_BUCKET,
            Key=s3_key,
            Body=json_data,
            ContentType='application/json'
        )

        # Read it back to verify
        try:
            obj = s3_client.get_object(Bucket=S3_BUCKET, Key=s3_key)
            content = obj['Body'].read().decode('utf-8')
            # Basic check: ensure content contains a known field from the data
            if 'conversation_id' in content or 'test' in content or conversation_id in content:
                print(f"✅ Successfully wrote and verified S3 object: s3://{S3_BUCKET}/{s3_key}")
                return True
            else:
                print(f"⚠️  Wrote to S3 but verification failed (content mismatch)")
                return False

        except Exception as e:
            print(f"❌ S3 verification read error: {e}")
            return False

    except Exception as e:
        print(f"❌ S3 error: {e}")
        return False

def lambda_handler(event, context):
    """
    Lambda handler for ElevenLabs webhook
    
    Event structure from API Gateway:
    {
        "body": "...",  # JSON string
        "headers": {...},
        "requestContext": {...}
    }
    """
    
    print(f"🚨 Webhook received at {datetime.now().isoformat()}")
    print(f"Event keys: {list(event.keys())}")
    
    try:
        # Get request body
        body = event.get('body', '')
        if not body:
            return {
                'statusCode': 400,
                'body': json.dumps({'error': 'Empty body'})
            }
        
        # Get headers (case-insensitive)
        headers = {k.lower(): v for k, v in event.get('headers', {}).items()}
        signature_header = headers.get('elevenlabs-signature', '')
        
        # Verify signature
        if WEBHOOK_SECRET and not verify_signature(body, signature_header):
            print("❌ Signature verification failed")
            return {
                'statusCode': 401,
                'body': json.dumps({'error': 'Invalid signature'})
            }
        
        # Parse JSON
        data = json.loads(body)
        event_type = data.get('type', 'UNKNOWN')
        
        print(f"📞 Event type: {event_type}")
        
        # Process post_call_transcription events
        if event_type == 'post_call_transcription':
            call_data = data.get('data', {})
            conversation_id = call_data.get('conversation_id', 'unknown')
            event_timestamp = data.get('event_timestamp', int(time.time()))
            analysis = call_data.get('analysis', {})
            
            print(f"📋 Processing call: {conversation_id}")
            
            # Extract metadata
            metadata = extract_metadata_from_elevenlabs(analysis)
            
            # Save to DynamoDB
            dynamodb_success = save_to_dynamodb(
                conversation_id=conversation_id,
                timestamp=event_timestamp,
                call_data=call_data,
                analysis=analysis,
                metadata=metadata
            )
            
            # Save to S3
            s3_success = save_to_s3(conversation_id=conversation_id, data=data)
            
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'status': 'success',
                    'conversation_id': conversation_id,
                    'dynamodb': 'saved' if dynamodb_success else 'failed',
                    's3': 'saved' if s3_success else 'failed'
                })
            }
        
        else:
            print(f"⚠️  Unhandled event type: {event_type}")
            return {
                'statusCode': 200,
                'body': json.dumps({
                    'status': 'ignored',
                    'reason': f'Event type {event_type} not processed'
                })
            }
    
    except json.JSONDecodeError as e:
        print(f"❌ JSON decode error: {e}")
        return {
            'statusCode': 400,
            'body': json.dumps({'error': 'Invalid JSON'})
        }
    
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }

# For local testing
if __name__ == "__main__":
    # Test event
    test_event = {
        'body': json.dumps({
            'type': 'post_call_transcription',
            'event_timestamp': int(time.time()),
            'data': {
                'conversation_id': 'test_12345',
                'agent_id': 'agent_test',
                'status': 'completed',
                'transcript': [
                    {'role': 'user', 'text': 'Test call'},
                    {'role': 'agent', 'text': 'Hello'}
                ],
                'analysis': {
                    'transcript_summary': 'Test call summary',
                    'call_successful': 'yes',
                    'data_collection_results': {
                        'emergency_type': {'value': 'test'},
                        'location': {'value': 'Nashville'},
                        'latitude': {'value': 36.1627},
                        'longitude': {'value': -86.7816},
                        'severity': {'value': 'low'}
                    }
                },
                'metadata': {
                    'call_duration_secs': 120
                }
            }
        }),
        'headers': {}
    }
    
    result = lambda_handler(test_event, None)
    print(json.dumps(result, indent=2))