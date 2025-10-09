# access911

access911 is an experimental emergency-response platform that demonstrates how modern AI and cloud services can augment 911 call handling during high-demand incidents. The system captures live voice calls through an AI voice agent (ElevenLabs), processes and enriches call transcripts and metadata, stores records in AWS (DynamoDB + S3), and feeds a front-end dashboard with a map visualization. A simulation API can generate large batches of synthetic incidents (using AWS Bedrock or templates) to test scale and operator workflows.

Key goals
- Provide a human-in-the-loop system for emergency call intake where an AI voice-agent handles the initial contact and extracts structured metadata.
- Persist full call records and concise summaries to AWS (S3 and DynamoDB) for operator review and downstream analysis.
- Offer a simulation mode to stress-test the pipeline and populate the dashboard with realistic, varied incidents.

This repository contains the server-side pieces (Lambda handlers, simulators, utilities) and documentation required to run and experiment with the project.

## High-level architecture

1. Caller interacts with an AI voice agent (ElevenLabs) which runs the voice session and performs transcription/analysis.
2. ElevenLabs forwards a webhook to an API Gateway endpoint.
3. API Gateway triggers a Lambda function (e.g. `eleven_labs_lambda.py`) which:
	 - Verifies the webhook signature (optional, via `WEBHOOK_SECRET`),
	 - Extracts transcript, analysis and structured metadata (emergency type, location, severity),
	 - Geocodes the text location with AWS Location Service (fallback),
	 - Stores a summarized record into DynamoDB and the full payload into S3.
4. A simulator Lambda (`wildfire-simulator-lambda.py`) or a local script can generate synthetic call data. For small batches it may call Bedrock to produce human-like summaries; for large batches it uses templates for throughput.
5. A frontend (not included here) consumes DynamoDB/S3 outputs and renders calls on a map for operators.

Diagram (conceptual):
TODO: REPLACE THIS WITH ACTUAL IMAGE
Caller (phone) → ElevenLabs voice agent → API Gateway → Lambda → DynamoDB / S3 → Frontend map
																						 ↘ Bedrock (simulation & models)

## What’s in this repo

- `eleven_labs_lambda.py` — Lambda handler for ElevenLabs webhooks: signature verification, metadata extraction, geocoding, DynamoDB + S3 persistence, local test harness.
- `wildfire-simulator-lambda.py` — A generalized simulator Lambda to generate batches of synthetic incidents across multiple scenarios (wildfire, hurricane, earthquake, tornado). Can call Bedrock for richer summaries when batch sizes are small.
- `test_aws_connection.py` — Local script to validate AWS credentials and connectivity for DynamoDB and S3; performs read/write smoke tests.
- `call_processor.py` — (utility) Placeholder for call-processing glue (may contain helpers used across Lambdas).
- `create_aws_resources.py`, `setup_geocoding.py`, `deploy_geocoding.sh`, `lambda-geocoding-policy.json` — Helpers and infra artifacts used to create necessary AWS resources and configure geocoding/location.
- `GEOCODING_SETUP.md`, `GEOCODING_SUMMARY.md`, `SETUP.md` — Setup notes and operational guidance.
- `requirements.txt` — Python dependencies for local testing and packaging for Lambda.

## Core design principles

- Human-in-the-loop: AI assists with intake and triage but human dispatchers retain authority and final decisions.
- Durable storage: Raw payloads are stored to S3 for audit and retraining; summarized, queryable records go to DynamoDB.
- Simulation-first testing: The simulator allows load testing and dataset generation for training and frontend demos.
- Modular: Webhook handling, geocoding, persistence, and simulation are separated so different components can be scaled or replaced independently.

## How the pieces work (concise)

- ElevenLabs webhook → `eleven_labs_lambda.lambda_handler`:
	- Parses the incoming JSON body and optional signature.
	- Extracts analysis (including `data_collection_results`).
	- Attempts to use AWS Location Service (`LOCATION_INDEX`) to geocode if coordinates are missing.
	- Saves a summarized item to DynamoDB and the full JSON to S3.

- Simulation (`wildfire-simulator-lambda.lambda_handler`):
	- Accepts parameters (num_calls, scenario, table_name) via event body.
	- For small batches (≤20) optionally calls Bedrock to create varied, human-like summaries.
	- For large batches uses templates to avoid throttling and generate thousands of records quickly.

## Scaling and load-balancing considerations

This architecture is designed so the cloud components can scale independently and handle bursts of traffic:

- API Gateway acts as the frontend HTTP layer, providing throttling, request validation, and basic rate-limiting.
- AWS Lambda provides on-demand compute with automatic concurrency scaling. Control concurrency with reserved concurrency settings if you must cap concurrent executions.
- DynamoDB is used for low-latency reads/writes; use on-demand capacity or provisioned capacity with autoscaling to handle spikes. Design primary keys and indexes for expected query patterns (e.g., conversation_id + timestamp).
- S3 provides essentially unlimited storage for raw call payloads and artifacts; use lifecycle policies to tier older objects to cheaper storage.
- Bedrock calls (or any external model calls) can be a bottleneck for high-volume synthetic generation — the simulator uses templates for bulk loads and Bedrock for smaller, high-quality batches.

Practical tips
- Use API Gateway throttling and WAF rules to protect the endpoint from accidental/hostile flood.
- Configure Lambda reserved concurrency if necessary to avoid overrunning downstream resources (DynamoDB throttling, IAM limits).
- Monitor DynamoDB consumed capacity and use adaptive capacity/autoscaling. Consider DynamoDB On-Demand for unpredictable spikes.

## Security and operational notes

- Protect `WEBHOOK_SECRET`, AWS credentials, and Bedrock API keys in a secrets manager (AWS Secrets Manager, Parameter Store) — do not check them into source control.
- Validate incoming webhook signatures when a secret is configured (the code shows optional verification).
- Use least-privilege IAM policies for Lambda functions — the repo includes `lambda-geocoding-policy.json` as a starting point.

## Environment variables (used by scripts / Lambdas)

Typical variables (set in Lambda configuration or your .env for local testing):

- `AWS_REGION` — AWS region to use
- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_SESSION_TOKEN` — AWS credentials (local testing only; use roles in Lambda)
- `DYNAMODB_TABLE_NAME` or `DYNAMODB_TABLE` — Name of the DynamoDB table for calls
- `S3_BUCKET_NAME` or `S3_BUCKET` — Name of the S3 bucket for raw call payloads
- `WEBHOOK_SECRET` — Secret used to verify ElevenLabs webhook signatures (optional)
- `LOCATION_INDEX` — AWS Location Service place index name used for geocoding
- `BEDROCK_MODEL` — Model identifier to use when calling Bedrock from the simulator

See `test_aws_connection.py` for a small smoke-test script that expects many of these variables and will verify read/write access to DynamoDB and S3.

## Running locally (development & tests)

1. Create a `.env` file or export environment variables described above.
2. Install dependencies:

		pip install -r requirements.txt

3. Test AWS connectivity (valid credentials and resources required):

		python test_aws_connection.py

4. Run the ElevenLabs webhook handler locally (quick smoke run):

		python eleven_labs_lambda.py

5. Run the simulator locally by invoking the Lambda handler in `wildfire-simulator-lambda.py` (or deploy it and call via API Gateway).

## Deployment notes

- Package and deploy the Lambda functions with your preferred deployment tool (SAM, Serverless Framework, Terraform, or manual zip uploads). Ensure the Lambda runtime matches the dependencies in `requirements.txt`.
- Create API Gateway endpoints (HTTP API or REST API) configured to trigger the Lambdas. Enable request validation and throttling.
- Provision DynamoDB table(s) and an S3 bucket with appropriate IAM roles for Lambda to write.

## Frontend & Map

The front-end (separate from this repo) is expected to read DynamoDB (or a read API) and render incidents on an interactive map. The DynamoDB items include lat/long fields (stored as Decimal in `eleven_labs_lambda.py`) and address text so pins can be plotted. A map-based view allows operators to:

- See incoming calls as map pins with color/priority by severity
- Click into a pin to view the summary + link to full S3 payload
- Filter by scenario, time range, or status

Leaflet, Mapbox GL, or similar libraries are good choices for a responsive operator map.

## Model training & Bedrock

- The simulator demonstrates how Bedrock can be used to synthesize higher-quality, human-like call summaries for small batches. These outputs can seed datasets for training models (sentiment or triage classifiers).
- The codebase shows where Bedrock calls would be made (`wildfire-simulator-lambda.py`). In production, collect high-quality labeled data (with human review) before training any model that influences actions.

## Next steps and recommendations

- Add a small frontend repo that subscribes or polls for new DynamoDB items and renders them on a map with real-time updates (WebSocket or polling).
- Add unit tests and CI to validate Lambda handlers and data schemas.
- Implement a retraining pipeline: collect labeled S3 payloads, build datasets, fine-tune models, and re-deploy inference endpoints behind Bedrock or other model hosting.
- Harden security: move secrets to AWS Secrets Manager and set up granular IAM roles.
