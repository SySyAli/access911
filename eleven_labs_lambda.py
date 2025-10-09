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
OPENAI_API_KEY = os.environ.get('OPENAI_API_KEY', '')

def geocode_location(location_text):
    """
    Geocode a location string to lat/lon using OpenAI GPT
    Returns (latitude, longitude) or (0.0, 0.0) if failed

    Always assumes Nashville, TN for this project
    Uses GPT to determine precise coordinates based on location knowledge
    """
    if not location_text or location_text == 'unknown':
        print("⚠️  No location text to geocode")
        return 0.0, 0.0

    if not OPENAI_API_KEY:
        print("⚠️  OpenAI API key not configured")
        return 0.0, 0.0

    try:
        import urllib.request

        # Always append Nashville, TN for context
        search_text = f"{location_text}, Nashville, TN"
        print(f"🤖 Using GPT to geocode: '{search_text}'")

        # Prepare OpenAI API request
        prompt = f"""You are a precise geocoding system. Given an address, return ONLY the exact latitude and longitude coordinates in JSON format.

Address: {search_text}

Return the coordinates as a JSON object with this exact format:
{{"latitude": <number>, "longitude": <number>}}

Be as precise as possible. For Nashville, TN addresses, use your knowledge of the city's geography to determine the most accurate coordinates. Do not include any explanation, only the JSON."""

        payload = {
            "model": "gpt-5",
            "messages": [
                {"role": "system", "content": "You are a precise geocoding API that returns coordinates in JSON format only."},
                {"role": "user", "content": prompt}
            ],
            "response_format": {"type": "json_object"},
            "temperature": 0
        }

        req = urllib.request.Request(
            'https://api.openai.com/v1/chat/completions',
            data=json.dumps(payload).encode('utf-8'),
            headers={
                'Content-Type': 'application/json',
                'Authorization': f'Bearer {OPENAI_API_KEY}'
            }
        )

        with urllib.request.urlopen(req, timeout=10) as response:
            result = json.loads(response.read().decode())

        # Parse GPT response
        coords_json = json.loads(result['choices'][0]['message']['content'])
        latitude = float(coords_json['latitude'])
        longitude = float(coords_json['longitude'])

        print(f"✅ GPT geocoded '{search_text}' → lat: {latitude}, lon: {longitude}")
        return latitude, longitude

    except Exception as e:
        print(f"❌ GPT geocoding error: {e}")
        import traceback
        traceback.print_exc()
        return 0.0, 0.0

def extract_metadata_from_elevenlabs(analysis):
    """Extract metadata from ElevenLabs data_collection_results"""
    data_collection = analysis.get('data_collection_results', {})

    def get_value(field_data, default):
        if isinstance(field_data, dict):
            return field_data.get('value', default)
        return field_data if field_data is not None else default

    # Extract basic metadata
    location_text = get_value(data_collection.get('location'), 'unknown')
    latitude = float(get_value(data_collection.get('latitude'), 0.0))
    longitude = float(get_value(data_collection.get('longitude'), 0.0))

    # If ElevenLabs didn't provide coordinates, geocode the location text
    if (latitude == 0.0 or longitude == 0.0) and location_text != 'unknown':
        print(f"🔍 ElevenLabs coordinates missing, attempting geocoding...")
        latitude, longitude = geocode_location(location_text)

    metadata = {
        'emergency_type': get_value(data_collection.get('emergency_type'), 'unknown'),
        'location': location_text,
        'latitude': latitude,
        'longitude': longitude,
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