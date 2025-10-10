# CORS Debug Steps

## Your CORS Configuration Looks Correct
Your settings are perfect for development:
- Access-Control-Allow-Origin: *
- Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
- Access-Control-Allow-Headers: Content-Type, Authorization

## Common Issues & Solutions

### 1. API Gateway Not Deployed
**Most Common Issue**: After configuring CORS, you must **deploy** the API.

**Fix**: 
1. Go to API Gateway Console
2. Select your API
3. Click "Actions" → "Deploy API"
4. Choose your stage (usually "prod" or "default")
5. Click "Deploy"

### 2. Lambda Function Missing CORS Headers
Your Lambda should also return CORS headers in the response.

**Add this to your Lambda function**:
```python
def lambda_handler(event, context):
    # Handle OPTIONS preflight
    if event.get('httpMethod') == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            },
            'body': ''
        }
    
    # Your existing code...
    
    # Make sure ALL responses include CORS headers
    return {
        'statusCode': 200,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
        'body': json.dumps(response_data)
    }
```

### 3. Test CORS
Open `test_cors.html` in your browser to test if CORS is working.

### 4. Check Browser Network Tab
1. Open browser DevTools (F12)
2. Go to Network tab
3. Try the simulation
4. Look for the OPTIONS request
5. Check if it returns 200 with CORS headers

## Quick Fix Checklist
- [ ] API Gateway CORS configured
- [ ] API Gateway deployed after CORS changes
- [ ] Lambda function returns CORS headers
- [ ] Lambda function handles OPTIONS method
- [ ] Test with curl or test_cors.html

## If Still Not Working
Try this curl command to test:
```bash
curl -X POST https://czwz6e7qje.execute-api.us-east-1.amazonaws.com/simulator \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:3000" \
  -d '{"num_calls": 5, "scenario": "nashville_tornado"}' \
  -v
```

The `-v` flag will show you the response headers.
