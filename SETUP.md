# ElevenLabs Webhook Setup

This project receives and processes call transcriptions and summaries from ElevenLabs via webhooks.

## Quick Start

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Start the Webhook Server

```bash
python webhook_server.py
```

The server will start on `http://localhost:8000`

### 3. Expose to Internet (for ElevenLabs)

Install ngrok:
```bash
# Install ngrok (if not already installed)
# Download from: https://ngrok.com/download

# Expose your local server
ngrok http 8000
```

Copy the HTTPS URL (e.g., `https://abc123.ngrok.io`)

### 4. Configure ElevenLabs Webhook

In your ElevenLabs dashboard:

1. Go to Webhooks settings
2. **Endpoint URL**: `https://abc123.ngrok.io/elevenlabs-webhook`
3. **Description**: "Call summaries webhook"
4. **Events**: ✅ Check "Transcription completed"
5. Save the webhook

## Usage

### View Recent Calls
Visit: `http://localhost:8000/recent-calls`

### Export Data to CSV
```bash
python call_processor.py
```

### Process Call Data
```python
from call_processor import CallDataProcessor

processor = CallDataProcessor()

# Get statistics
stats = processor.get_call_stats()
print(stats)

# Export to CSV
csv_file = processor.export_to_csv()

# Search calls
results = processor.search_calls("appointment")
```

## File Structure

- `webhook_server.py` - Main FastAPI webhook server
- `call_processor.py` - Data processing and export utilities
- `webhook_data/` - Directory where call data is stored
  - `webhook_log.jsonl` - Master log of all webhooks
  - `call_*.json` - Individual call files
- `requirements.txt` - Python dependencies

## API Endpoints

- `POST /elevenlabs-webhook` - Receives webhook data from ElevenLabs
- `GET /` - Health check
- `GET /recent-calls?limit=10` - Get recent call summaries

## Data Format

Each webhook contains:
```json
{
  "conversation_id": "abc123",
  "event_type": "transcription_completed",
  "summary": "Customer called about...",
  "transcript": "Full conversation text...",
  "duration_seconds": 120,
  "speakers": [...],
  "webhook_received_at": "2024-01-01T12:00:00"
}
```

## Troubleshooting

- **Webhook not receiving data**: Check ngrok URL is correct in ElevenLabs
- **Server not starting**: Ensure port 8000 is not in use
- **No data files**: Make test call in ElevenLabs to trigger webhook