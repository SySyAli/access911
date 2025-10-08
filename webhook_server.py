from fastapi import FastAPI, Request, HTTPException
from datetime import datetime
import json
import os
from pathlib import Path

app = FastAPI(title="ElevenLabs Webhook Server", version="1.0.0")

# Create data directory if it doesn't exist
data_dir = Path("webhook_data")
data_dir.mkdir(exist_ok=True)

@app.post("/elevenlabs-webhook")
async def elevenlabs_webhook(request: Request):
    """
    Webhook endpoint to receive ElevenLabs call transcription data
    """
    try:
        # Get the JSON payload
        data = await request.json()

        # Add timestamp to the data
        data["webhook_received_at"] = datetime.now().isoformat()

        # Extract key information for logging
        conversation_id = data.get("conversation_id", "unknown")
        event_type = data.get("event_type", "unknown")

        print(f"📞 Received webhook: {event_type} for conversation {conversation_id}")

        # Save to individual JSON file
        filename = f"call_{conversation_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        filepath = data_dir / filename

        with open(filepath, "w") as f:
            json.dump(data, f, indent=2)

        # Also append to a master log file
        log_file = data_dir / "webhook_log.jsonl"
        with open(log_file, "a") as f:
            f.write(json.dumps(data) + "\n")

        print(f"💾 Saved to: {filepath}")

        # Print summary if available
        if "summary" in data:
            print(f"📝 Summary: {data['summary'][:100]}...")

        return {"status": "success", "message": "Webhook received and processed"}

    except Exception as e:
        print(f"❌ Error processing webhook: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Error processing webhook: {str(e)}")

@app.get("/")
async def root():
    """
    Health check endpoint
    """
    return {"message": "ElevenLabs Webhook Server is running", "status": "healthy"}

@app.get("/recent-calls")
async def get_recent_calls(limit: int = 10):
    """
    Get recent call summaries
    """
    try:
        log_file = data_dir / "webhook_log.jsonl"
        if not log_file.exists():
            return {"calls": [], "message": "No calls received yet"}

        calls = []
        with open(log_file, "r") as f:
            lines = f.readlines()

        # Get the last 'limit' number of calls
        for line in lines[-limit:]:
            call_data = json.loads(line.strip())
            # Extract key info for summary
            summary_info = {
                "conversation_id": call_data.get("conversation_id"),
                "event_type": call_data.get("event_type"),
                "summary": call_data.get("summary"),
                "timestamp": call_data.get("webhook_received_at"),
                "duration": call_data.get("duration_seconds")
            }
            calls.append(summary_info)

        return {"calls": calls, "total": len(calls)}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving calls: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)