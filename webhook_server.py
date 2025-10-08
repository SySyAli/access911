#!/usr/bin/env python3
"""
SUPER SIMPLE WEBHOOK SERVER WITH MAXIMUM LOGGING
Logs absolutely everything to help debug
"""
from fastapi import FastAPI, Request
from datetime import datetime
import json
from pathlib import Path
import time
import hmac
from hashlib import sha256
from dotenv import load_dotenv
import os
import boto3
from botocore.exceptions import ClientError

# Load environment variables
load_dotenv()

app = FastAPI(title="ElevenLabs Webhook Server with AWS", version="2.0.0")

# Webhook secret
WEBHOOK_SECRET = os.getenv("ELEVENLABS_WEBHOOK_SECRET", "")

# AWS Configuration
AWS_REGION = os.getenv("AWS_REGION", "us-east-1")
AWS_ACCESS_KEY = os.getenv("AWS_ACCESS_KEY_ID", "")
AWS_SECRET_KEY = os.getenv("AWS_SECRET_ACCESS_KEY", "")
AWS_SESSION_TOKEN = os.getenv("AWS_SESSION_TOKEN", "")
DYNAMODB_TABLE = os.getenv("DYNAMODB_TABLE_NAME", "")
S3_BUCKET = os.getenv("S3_BUCKET_NAME", "")

# Initialize AWS clients
dynamodb = None
s3_client = None

if AWS_ACCESS_KEY and AWS_SECRET_KEY:
    try:
        dynamodb = boto3.resource(
            'dynamodb',
            aws_access_key_id=AWS_ACCESS_KEY,
            aws_secret_access_key=AWS_SECRET_KEY,
            aws_session_token=AWS_SESSION_TOKEN if AWS_SESSION_TOKEN else None,
            region_name=AWS_REGION
        )
        s3_client = boto3.client(
            's3',
            aws_access_key_id=AWS_ACCESS_KEY,
            aws_secret_access_key=AWS_SECRET_KEY,
            aws_session_token=AWS_SESSION_TOKEN if AWS_SESSION_TOKEN else None,
            region_name=AWS_REGION
        )
        print(f"✅ AWS clients initialized (Region: {AWS_REGION})")
    except Exception as e:
        print(f"⚠️  AWS initialization failed: {e}")

# Data directory
data_dir = Path("webhook_data")
data_dir.mkdir(exist_ok=True)

def save_to_dynamodb(conversation_id: str, timestamp: int, call_data: dict, analysis: dict) -> bool:
    """Save call data to DynamoDB"""
    if not dynamodb or not DYNAMODB_TABLE:
        print(f"   ⚠️  DynamoDB not configured, skipping")
        return False

    try:
        table = dynamodb.Table(DYNAMODB_TABLE)

        item = {
            'conversation_id': conversation_id,
            'timestamp': timestamp,
            'agent_id': call_data.get('agent_id', ''),
            'summary': analysis.get('transcript_summary', ''),
            'call_successful': analysis.get('call_successful', ''),
            'duration_secs': call_data.get('metadata', {}).get('call_duration_secs', 0),
            'transcript_length': len(call_data.get('transcript', [])),
            'created_at': datetime.now().isoformat()
        }

        table.put_item(Item=item)
        print(f"   ✅ DynamoDB: Saved to table '{DYNAMODB_TABLE}'")
        return True
    except ClientError as e:
        print(f"   ❌ DynamoDB save failed: {e}")
        return False

def save_to_s3(conversation_id: str, data: dict) -> bool:
    """Save full call data to S3"""
    if not s3_client or not S3_BUCKET:
        print(f"   ⚠️  S3 not configured, skipping")
        return False

    try:
        s3_key = f"calls/{conversation_id}/{conversation_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"

        s3_client.put_object(
            Bucket=S3_BUCKET,
            Key=s3_key,
            Body=json.dumps(data, indent=2),
            ContentType='application/json'
        )

        print(f"   ✅ S3: Uploaded to s3://{S3_BUCKET}/{s3_key}")
        return True
    except ClientError as e:
        print(f"   ❌ S3 upload failed: {e}")
        return False

@app.post("/elevenlabs-webhook")
async def webhook(request: Request):
    """
    SUPER SIMPLE WEBHOOK WITH TONS OF LOGGING
    """
    print("\n" + "="*100)
    print(f"⏰ TIMESTAMP: {datetime.now().isoformat()}")
    print("🚨 WEBHOOK INCOMING!")
    print("="*100)

    try:
        # 1. LOG RAW REQUEST INFO
        print(f"\n📍 REQUEST INFO:")
        print(f"   Method: {request.method}")
        print(f"   URL: {request.url}")
        print(f"   Client: {request.client}")

        # 2. LOG ALL HEADERS
        print(f"\n📋 ALL HEADERS:")
        for header_name, header_value in request.headers.items():
            # Truncate very long values
            display_value = header_value[:200] + "..." if len(header_value) > 200 else header_value
            print(f"   {header_name}: {display_value}")

        # 3. GET RAW BODY
        body = await request.body()
        print(f"\n📦 BODY INFO:")
        print(f"   Size: {len(body)} bytes")
        print(f"   First 500 chars: {body[:500].decode('utf-8', errors='ignore')}")

        # 4. CHECK FOR SIGNATURE HEADER
        signature_header = request.headers.get("elevenlabs-signature", None)
        print(f"\n🔐 SIGNATURE:")
        if signature_header:
            print(f"   Found: YES")
            print(f"   Value: {signature_header}")

            # Parse signature
            headers_parts = signature_header.split(",")
            timestamp = None
            signature = None

            for part in headers_parts:
                if part.startswith("t="):
                    timestamp = part[2:]
                elif part.startswith("v0="):
                    signature = part

            print(f"   Timestamp: {timestamp}")
            print(f"   Signature: {signature}")

            # Validate timestamp
            if timestamp:
                req_timestamp = int(timestamp) * 1000
                tolerance = int(time.time() * 1000) - (30 * 60 * 1000)
                is_valid_time = req_timestamp > tolerance
                print(f"   Timestamp valid: {is_valid_time}")

            # Validate signature
            if timestamp and signature and WEBHOOK_SECRET:
                message = f"{timestamp}.{body.decode('utf-8')}"
                expected_digest = 'v0=' + hmac.new(
                    key=WEBHOOK_SECRET.encode("utf-8"),
                    msg=message.encode("utf-8"),
                    digestmod=sha256
                ).hexdigest()
                signature_matches = hmac.compare_digest(signature, expected_digest)
                print(f"   Signature valid: {signature_matches}")
                if not signature_matches:
                    print(f"   Expected: {expected_digest}")
                    print(f"   Received: {signature}")
        else:
            print(f"   Found: NO")
            print(f"   ⚠️  WARNING: No signature header found!")

        # 5. PARSE JSON
        print(f"\n📄 PARSING JSON:")
        try:
            data = json.loads(body.decode('utf-8'))
            print(f"   Success: YES")
            print(f"   Top-level keys: {list(data.keys())}")

            # 6. EXTRACT KEY FIELDS
            event_type = data.get("type", "UNKNOWN")
            event_timestamp = data.get("event_timestamp", "UNKNOWN")

            print(f"\n🔍 WEBHOOK EVENT:")
            print(f"   Type: {event_type}")
            print(f"   Timestamp: {event_timestamp}")

            # 7. CHECK EVENT TYPE
            if event_type == "post_call_transcription":
                print(f"   ✅ CORRECT EVENT TYPE!")

                call_data = data.get("data", {})
                print(f"\n📞 CALL DATA:")
                print(f"   Conversation ID: {call_data.get('conversation_id', 'MISSING')}")
                print(f"   Agent ID: {call_data.get('agent_id', 'MISSING')}")
                print(f"   Status: {call_data.get('status', 'MISSING')}")

                transcript = call_data.get("transcript", [])
                print(f"   Transcript turns: {len(transcript)}")

                analysis = call_data.get("analysis", {})
                summary = analysis.get("transcript_summary", "NO SUMMARY")
                print(f"\n📝 SUMMARY:")
                print(f"   {summary[:300]}...")

                # 8. SAVE TO FILE (Local Backup)
                conv_id = call_data.get('conversation_id', 'unknown')
                filename = f"call_{conv_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
                filepath = data_dir / filename

                with open(filepath, "w") as f:
                    json.dump(data, f, indent=2)

                print(f"\n💾 STORAGE (3 methods):")
                print(f"   Local File: {filepath}")

                # Save to log
                log_file = data_dir / "webhook_log.jsonl"
                with open(log_file, "a") as f:
                    f.write(json.dumps(data) + "\n")
                print(f"   Local Log: {log_file}")

                # 9. SAVE TO DYNAMODB
                save_to_dynamodb(
                    conversation_id=conv_id,
                    timestamp=event_timestamp,
                    call_data=call_data,
                    analysis=analysis
                )

                # 10. SAVE TO S3
                save_to_s3(conversation_id=conv_id, data=data)

            elif event_type == "post_call_audio":
                print(f"   ⚠️  WRONG EVENT TYPE: This is audio, not transcription!")
                print(f"   You need to change the webhook event in ElevenLabs to 'post_call_transcription'")

            else:
                print(f"   ⚠️  UNKNOWN EVENT TYPE: {event_type}")
                print(f"   Full data: {json.dumps(data, indent=2)[:1000]}")

        except json.JSONDecodeError as e:
            print(f"   Success: NO")
            print(f"   Error: {e}")

        print("\n✅ WEBHOOK PROCESSING COMPLETE")
        print("="*100 + "\n")

        return {"status": "success", "message": "Webhook received"}

    except Exception as e:
        print(f"\n❌ EXCEPTION OCCURRED:")
        print(f"   Type: {type(e).__name__}")
        print(f"   Message: {str(e)}")
        import traceback
        traceback.print_exc()
        print("="*100 + "\n")
        return {"status": "error", "message": str(e)}

@app.get("/")
async def root():
    return {"message": "Simple ElevenLabs Webhook Server", "status": "running"}

@app.get("/recent-calls")
async def recent_calls():
    """Get recent calls with summaries"""
    try:
        log_file = data_dir / "webhook_log.jsonl"
        if not log_file.exists():
            return {"calls": [], "message": "No calls yet"}

        calls = []
        with open(log_file, "r") as f:
            for line in f:
                event = json.loads(line.strip())
                if event.get("type") == "post_call_transcription":
                    call_data = event.get("data", {})
                    analysis = call_data.get("analysis", {})
                    calls.append({
                        "conversation_id": call_data.get("conversation_id"),
                        "summary": analysis.get("transcript_summary"),
                        "timestamp": event.get("event_timestamp")
                    })

        return {"calls": calls[-10:], "total": len(calls)}

    except Exception as e:
        return {"error": str(e)}

if __name__ == "__main__":
    import uvicorn
    print("="*80)
    print("🚀 Starting ElevenLabs Webhook Server with AWS Integration")
    print("="*80)
    print(f"\n📁 Local Storage:")
    print(f"   Data directory: {data_dir.absolute()}")
    print(f"\n🔐 Security:")
    print(f"   Webhook secret: {'✅ Configured' if WEBHOOK_SECRET else '❌ Missing'}")
    print(f"\n☁️  AWS Configuration:")
    print(f"   Region: {AWS_REGION}")
    print(f"   DynamoDB Table: {DYNAMODB_TABLE if DYNAMODB_TABLE else '❌ Not configured'}")
    print(f"   S3 Bucket: {S3_BUCKET if S3_BUCKET else '❌ Not configured'}")
    print(f"   Status: {'✅ Connected' if (dynamodb and s3_client) else '⚠️  Not connected'}")
    print(f"\n💾 Storage Methods:")
    print(f"   1. Local files: ✅ Active")
    print(f"   2. DynamoDB: {'✅ Active' if dynamodb else '⚠️  Disabled'}")
    print(f"   3. S3: {'✅ Active' if s3_client else '⚠️  Disabled'}")
    print("="*80 + "\n")
    uvicorn.run(app, host="0.0.0.0", port=8000)