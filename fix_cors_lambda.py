# Add this to your existing lambda_handler function in your AWS Lambda

def lambda_handler(event, context):
    """
    Generalized emergency call simulator with CORS support
    """
    
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
    
    print("🚨 Starting Emergency Call Simulation")
    
    # Parse request parameters
    body = json.loads(event.get('body', '{}')) if event.get('body') else {}
    
    num_calls = body.get('num_calls', 1)
    scenario_name = body.get('scenario', 'la_wildfire')
    table_name = body.get('table_name', DEFAULT_TABLE_NAME)
    
    # Validate scenario
    if scenario_name not in SCENARIOS:
        return {
            'statusCode': 400,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
                'Content-Type': 'application/json'
            },
            'body': json.dumps({
                'error': f'Unknown scenario: {scenario_name}',
                'available_scenarios': list(SCENARIOS.keys())
            })
        }
    
    scenario = SCENARIOS[scenario_name]
    table = dynamodb.Table(table_name)
    
    # Determine generation method
    use_ai = num_calls <= 20
    generation_method = "Bedrock AI" if use_ai else "Templates (fast mode)"
    
    print(f"Scenario: {scenario['name']}")
    print(f"Generating {num_calls} calls to table {table_name}")
    print(f"Generation method: {generation_method}")
    
    generated_calls = []
    errors = []
    
    for i in range(num_calls):
        try:
            call = generate_call(i, num_calls, scenario, scenario_name, use_ai)
            table.put_item(Item=call)
            
            generated_calls.append({
                'call_id': call['call_id'],
                'location': call['location']['area'],
                'emergency_type': call['emergency_type']
            })
            
            if (i + 1) % 10 == 0:
                print(f"✓ Progress: {i+1}/{num_calls}")
                
        except Exception as e:
            error_msg = f"Error on call {i+1}: {str(e)}"
            print(f"✗ {error_msg}")
            errors.append(error_msg)
    
    print(f"✅ Completed: {len(generated_calls)}/{num_calls} successful")
    
    return {
        'statusCode': 200,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
        },
        'body': json.dumps({
            'message': f'Generated {len(generated_calls)} calls for {scenario["name"]}',
            'scenario': scenario_name,
            'total_requested': num_calls,
            'successful': len(generated_calls),
            'failed': len(errors),
            'generation_method': generation_method,
            'sample_calls': generated_calls[:5],
            'errors': errors[:3] if errors else []
        }, indent=2)
    }
