# DynamoDB Integration Setup

Your dashboard is now configured to pull active calls from your Amazon DynamoDB table: `elevenlabs-call-data`

## Setup Instructions

### 1. Configure AWS Credentials

Create a `.env.local` file in the root of the `dispatch-dashboard` directory with your AWS credentials:

```bash
# Copy the example file
cp .env.local.example .env.local
```

Then edit `.env.local` and add your AWS credentials:

```env
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_actual_access_key
AWS_SECRET_ACCESS_KEY=your_actual_secret_key
DYNAMODB_TABLE_NAME=elevenlabs-call-data
```

### 2. Get AWS Credentials

1. Go to [AWS IAM Console](https://console.aws.amazon.com/iam/)
2. Click "Users" in the left sidebar
3. Click your username or create a new user
4. Go to "Security credentials" tab
5. Click "Create access key"
6. Choose "Application running on AWS compute service" or "Other"
7. Copy the Access Key ID and Secret Access Key
8. Paste them into your `.env.local` file

### 3. Required IAM Permissions

Your AWS user needs the following DynamoDB permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:Scan",
        "dynamodb:GetItem",
        "dynamodb:Query"
      ],
      "Resource": "arn:aws:dynamodb:us-east-1:315866721374:table/elevenlabs-call-data"
    }
  ]
}
```

## DynamoDB Table Schema

The API expects your DynamoDB table to have items with the following structure (flexible field mapping):

### Required/Mapped Fields:

| DynamoDB Field | Dashboard Field | Type | Description |
|---------------|-----------------|------|-------------|
| `id` or `callId` | `id` | String | Unique call identifier |
| `time` or `timestamp` | `time` | ISO String | Call timestamp |
| `severity` | `severity` | String | `critical`, `high`, `medium`, or `low` |
| `type` or `callType` | `type` | String | Type of emergency |
| `status` | `status` | String | `active` or `resolved` |
| `description` or `summary` | `description` | String | Call description |
| `caller` or `callerName` | `caller` | String | Caller name |
| `units` or `unitsDispatched` | `units` | Array | List of unit IDs |

### Location Fields:

The location can be structured in two ways:

**Option 1: Nested object**
```json
{
  "location": {
    "address": "1200 Broadway, Nashville, TN",
    "coordinates": [-86.7816, 36.1627]
  }
}
```

**Option 2: Flat structure**
```json
{
  "address": "1200 Broadway, Nashville, TN",
  "coordinates": [-86.7816, 36.1627]
}
```

### Example DynamoDB Item:

```json
{
  "id": "CALL-001",
  "timestamp": "2025-10-08T14:32:00Z",
  "severity": "critical",
  "type": "Medical Emergency",
  "status": "active",
  "description": "Cardiac arrest reported, patient unconscious",
  "caller": "Store Manager",
  "address": "1200 Broadway, Nashville, TN",
  "coordinates": [-86.7816, 36.1627],
  "units": ["AMB-12", "ENG-5"]
}
```

## How It Works

1. **API Route**: `/app/api/emergencies/route.ts` connects to DynamoDB
2. **Data Fetch**: The dashboard fetches data on load and every 10 seconds
3. **Fallback**: If DynamoDB fails, it falls back to local JSON data
4. **Filtering**: Only items with `status: "active"` are displayed

## Testing

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Navigate to the dashboard
3. Open browser console to see any connection errors
4. Active calls from DynamoDB should appear in the emergency list

## Troubleshooting

### "Failed to fetch emergencies from API"
- Check your AWS credentials in `.env.local`
- Verify IAM permissions for DynamoDB access
- Ensure table name matches: `elevenlabs-call-data`

### No calls showing up
- Verify your DynamoDB table has items with `status: "active"`
- Check browser console for error messages
- Test the API directly: `http://localhost:3000/api/emergencies`

### Authentication errors
- Ensure AWS credentials are correct
- Check IAM user has DynamoDB read permissions
- Verify the table ARN in permissions policy

## Security Notes

⚠️ **IMPORTANT**: 
- Never commit `.env.local` to git (it's already in `.gitignore`)
- Use IAM roles instead of access keys when deploying to production
- Consider using AWS Secrets Manager for production deployments
- Rotate access keys regularly

## Production Deployment

For production on Vercel/AWS:

1. Add environment variables in your hosting platform
2. Consider using AWS IAM roles instead of access keys
3. Set up VPC endpoints for secure DynamoDB access
4. Enable CloudWatch logging for monitoring

## Need Help?

The API route includes error logging. Check your console output for detailed error messages if connections fail.

