# Fix CORS Issue for AWS Lambda

## Problem
Your Lambda function is missing CORS headers for preflight OPTIONS requests, causing browser CORS errors.

## Solution 1: Update Your Lambda Code

Add this to the beginning of your `lambda_handler` function:

```python
def lambda_handler(event, context):
    # Handle CORS preflight requests
    if event.get('httpMethod') == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
                'Access-Control-Max-Age': '86400',
            },
            'body': ''
        }
    
    # ... rest of your existing code ...
    
    # Make sure ALL return statements include CORS headers:
    return {
        'statusCode': 200,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
        },
        'body': json.dumps(response_data)
    }
```

## Solution 2: API Gateway CORS Configuration

Alternatively, configure CORS directly in API Gateway:

1. Go to AWS API Gateway Console
2. Select your API
3. Select the `/simulator` resource
4. Click "Actions" → "Enable CORS"
5. Configure:
   - Access-Control-Allow-Origin: `*`
   - Access-Control-Allow-Headers: `Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token`
   - Access-Control-Allow-Methods: `GET,POST,OPTIONS`
6. Deploy the API

## Solution 3: Quick Test

For now, you can test the simulation by running this curl command:

```bash
curl -X POST https://czwz6e7qje.execute-api.us-east-1.amazonaws.com/simulator \
  -H "Content-Type: application/json" \
  -d '{"num_calls": 10, "scenario": "nashville_tornado"}'
```

## Recommended Fix

Update your Lambda code with the CORS headers shown above. This is the most reliable solution.
