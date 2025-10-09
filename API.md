# API Reference — DispatchAI

This document describes the public HTTP endpoints used by the project. Both endpoints are POST endpoints and are intended to be invoked by external services (ElevenLabs webhook) or by operators/test harnesses (simulator).

IMPORTANT: These endpoints are the public entry points to your system. Treat them as untrusted input and protect them with authentication, request validation, rate-limiting, and WAF rules where appropriate.

## 1) ElevenLabs webhook handler

- URL (example):

  https://962qqr5f50.execute-api.us-east-1.amazonaws.com/elevenlabs-webhook-handler

- Method: POST
- Purpose: Receive webhook callbacks from ElevenLabs containing call transcripts, analysis and metadata. The Lambda processes the payload, optionally verifies the signature, extracts metadata, geocodes if needed, saves a summarized item to DynamoDB and the full payload to S3.

- Headers:
  - `Content-Type: application/json`
  - `ElevenLabs-Signature` (optional) — signature header sent by ElevenLabs used by `eleven_labs_lambda.py` to verify webhook authenticity when `WEBHOOK_SECRET` is configured.

- Request body (example structure):

  {
    "type": "post_call_transcription",
    "event_timestamp": 1696950000,
    "data": {
      "conversation_id": "<string>",
      "agent_id": "<string>",
      "status": "completed",
      "transcript": [ {"role": "user", "text": "..."}, {"role":"agent","text":"..."} ],
      "analysis": {
        "transcript_summary": "string",
        "call_successful": "yes|no",
        "data_collection_results": {
          "location": {"value": "Nashville"},
          "latitude": {"value": 36.1627},
          "longitude": {"value": -86.7816},
          "emergency_type": {"value": "medical_emergency"},
          "severity": {"value": "high"}
        }
      },
      "metadata": {
        "call_duration_secs": 120
      }
    }
  }

- Response (success):

  HTTP 200
  {
    "status": "success",
    "conversation_id": "<conversation_id>",
    "dynamodb": "saved|failed",
    "s3": "saved|failed"
  }

- Response (errors):
  - 400 — Bad Request / invalid JSON
  - 401 — Invalid signature (if `WEBHOOK_SECRET` is set and signature verification fails)
  - 500 — Processing error

- Example curl (replace with real URL and signature header if used):

  curl -X POST \
    -H "Content-Type: application/json" \
    -d @payload.json \
    https://962qqr5f50.execute-api.us-east-1.amazonaws.com/elevenlabs-webhook-handler

Notes & security
- If `WEBHOOK_SECRET` is configured, `eleven_labs_lambda.py` verifies the signature header. Configure ElevenLabs webhook to sign requests and store the secret in AWS Secrets Manager or SSM Parameter Store for Lambdas.
- Validate and sanitize all fields before storing; consider PII redaction for transcripts if required by policy.

## 2) LA Wildfire Simulator (batch generator)

- URL (example):

  https://czwz6e7qje.execute-api.us-east-1.amazonaws.com/la-wildfire-simulator

- Method: POST
- Purpose: Generate synthetic call records and insert them into DynamoDB for testing and load simulations. For small batches the simulator may call Bedrock for human-like summaries; for larger batches it uses templates for throughput.

- Headers:
  - `Content-Type: application/json`

- Request body (example):

  {
    "num_calls": 200,
    "scenario": "nashville_tornado",
    "table_name": "wildfire-simulation-calls"   // optional: override default
  }

- Response (success):

  HTTP 200
  {
    "message": "Generated X calls for <Scenario Name>",
    "scenario": "nashville_tornado",
    "total_requested": 200,
    "successful": 200,
    "failed": 0,
    "generation_method": "Templates (fast mode) | Bedrock AI",
    "sample_calls": [ { "call_id": "...", "location": "...", "emergency_type": "..." } ],
    "errors": []
  }

- Response (errors):
  - 400 — Unknown scenario or invalid input
  - 500 — Processing error (Bedrock failures, DynamoDB errors, etc.)

- Example curl:

  curl -X POST \
    -H "Content-Type: application/json" \
    -d '{"num_calls":200, "scenario":"nashville_tornado"}' \
    https://czwz6e7qje.execute-api.us-east-1.amazonaws.com/la-wildfire-simulator

Notes & safety
- The simulator can write many items to DynamoDB; ensure the target table has suitable capacity or is set to on-demand mode to avoid throttling and costs.
- Bedrock calls are used for small batches and are rate- and cost-sensitive. For large-scale synthetic data use the template mode (or run Bedrock offline with sampling).

## Common operational notes

- API Gateway
  - Configure throttling and WAF rules to protect the endpoints from abusive traffic.
  - Enable request validation where possible to reject invalid shapes early.

- Authentication & secrets
  - Protect `WEBHOOK_SECRET`, Bedrock credentials, and any other secrets in AWS Secrets Manager or SSM Parameter Store.
  - If you expose the simulator endpoint publicly, add authentication (API key, IAM authorizer, or Cognito) to avoid misuse.

- Observability
  - Add structured logging and CloudWatch metrics for request counts, latencies, and failure rates.
  - Track DynamoDB throttling and S3 errors; use alarms to detect issues early.

---

If you want, I can also generate an `openapi.yaml` from this spec and add example Postman collections or a simple test script that calls both endpoints and verifies expected results.
