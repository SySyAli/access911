import json
import boto3
from datetime import datetime
import random
import time
import os

# Initialize AWS clients
bedrock = boto3.client('bedrock-runtime')
dynamodb = boto3.resource('dynamodb')

# Configuration
DEFAULT_TABLE_NAME = os.environ.get('DYNAMODB_TABLE', 'wildfire-simulation-calls')
DEFAULT_REGION = os.environ.get('AWS_REGION', 'us-east-1')
DEFAULT_BEDROCK_MODEL = os.environ.get('BEDROCK_MODEL', 'us.anthropic.claude-3-5-sonnet-20241022-v2:0')

# Scenario configurations
SCENARIOS = {
    'la_wildfire': {
        'name': 'Los Angeles Wildfire',
        'locations': [
            {'area': 'Pacific Palisades', 'lat': 34.0453, 'lon': -118.5270},
            {'area': 'Malibu', 'lat': 34.0259, 'lon': -118.7798},
            {'area': 'Topanga', 'lat': 34.0941, 'lon': -118.6018},
            {'area': 'Brentwood', 'lat': 34.0622, 'lon': -118.4747},
            {'area': 'Santa Monica Mountains', 'lat': 34.0954, 'lon': -118.7513}
        ],
        'streets': ['Sunset Mesa Dr', 'Palisades Dr', 'Via de la Paz', 'Porto Marina Way', 'Revello Dr'],
        'emergency_types': [
            {'type': 'structure_fire', 'desc': 'house fire with family evacuating', 'sev': 'critical'},
            {'type': 'evacuation_assistance', 'desc': 'resident needs evacuation help', 'sev': 'high'},
            {'type': 'trapped_person', 'desc': 'person trapped by fire', 'sev': 'critical'},
            {'type': 'medical_emergency', 'desc': 'smoke inhalation injury', 'sev': 'high'},
            {'type': 'shelter_information', 'desc': 'evacuee requesting shelter location', 'sev': 'moderate'}
        ]
    },
    'hurricane_florida': {
        'name': 'Florida Hurricane',
        'locations': [
            {'area': 'Miami Beach', 'lat': 25.7907, 'lon': -80.1300},
            {'area': 'Fort Lauderdale', 'lat': 26.1224, 'lon': -80.1373},
            {'area': 'West Palm Beach', 'lat': 26.7153, 'lon': -80.0534}
        ],
        'streets': ['Ocean Dr', 'Collins Ave', 'Washington Ave', 'Lincoln Rd', 'Alton Rd'],
        'emergency_types': [
            {'type': 'flooding', 'desc': 'severe flooding in home', 'sev': 'critical'},
            {'type': 'wind_damage', 'desc': 'roof damaged by wind', 'sev': 'high'},
            {'type': 'power_outage', 'desc': 'power lines down', 'sev': 'high'},
            {'type': 'evacuation_needed', 'desc': 'requesting evacuation', 'sev': 'critical'}
        ]
    },
    'earthquake_sf': {
        'name': 'San Francisco Earthquake',
        'locations': [
            {'area': 'Marina District', 'lat': 37.8033, 'lon': -122.4377},
            {'area': 'Mission District', 'lat': 37.7599, 'lon': -122.4148},
            {'area': 'Financial District', 'lat': 37.7946, 'lon': -122.3999}
        ],
        'streets': ['Market St', 'Mission St', 'Valencia St', 'Folsom St', 'Howard St'],
        'emergency_types': [
            {'type': 'building_collapse', 'desc': 'partial building collapse', 'sev': 'critical'},
            {'type': 'gas_leak', 'desc': 'gas leak detected', 'sev': 'critical'},
            {'type': 'trapped_person', 'desc': 'person trapped in debris', 'sev': 'critical'},
            {'type': 'medical_injury', 'desc': 'injuries from falling objects', 'sev': 'high'}
        ]
    },
    'nashville_tornado': {
        'name': 'Nashville Tornado Outbreak',
        'locations': [
            {'area': 'Downtown Nashville', 'lat': 36.1627, 'lon': -86.7816},
            {'area': 'East Nashville', 'lat': 36.1714, 'lon': -86.7489},
            {'area': 'Germantown', 'lat': 36.1752, 'lon': -86.7845},
            {'area': 'The Gulch', 'lat': 36.1540, 'lon': -86.7782},
            {'area': 'Music Row', 'lat': 36.1487, 'lon': -86.7977}
        ],
        'streets': ['Broadway', 'Music Valley Dr', 'Dickerson Pike', 'Gallatin Pike', 'Woodland St', 'Main St', 'Church St'],
        'emergency_types': [
            {'type': 'building_damage', 'desc': 'severe structural damage from tornado', 'sev': 'critical'},
            {'type': 'trapped_person', 'desc': 'person trapped in collapsed building', 'sev': 'critical'},
            {'type': 'debris_injury', 'desc': 'injuries from flying debris', 'sev': 'high'},
            {'type': 'power_lines_down', 'desc': 'downed power lines blocking road', 'sev': 'high'},
            {'type': 'gas_leak', 'desc': 'gas line ruptured by tornado', 'sev': 'critical'},
            {'type': 'vehicle_accident', 'desc': 'multi-vehicle accident during storm', 'sev': 'high'},
            {'type': 'shelter_needed', 'desc': 'displaced resident needs shelter', 'sev': 'moderate'}
        ]
    }
}

def lambda_handler(event, context):
    """
    Generalized emergency call simulator
    """
    
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
            'headers': {'Access-Control-Allow-Origin': '*'},
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
            'Access-Control-Allow-Origin': '*'
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

def generate_call(idx, total, scenario, scenario_name, use_ai):
    """Generate a single emergency call"""
    
    # Generate unique identifiers
    ts = int(time.time()) + idx
    call_id = f"{scenario_name.upper()}-{ts}-{random.randint(1000, 9999)}"
    
    # Select random location
    location = random.choice(scenario['locations'])
    
    # Add variance to coordinates
    lat = location['lat'] + random.uniform(-0.02, 0.02)
    lon = location['lon'] + random.uniform(-0.02, 0.02)
    
    # Generate address
    street = random.choice(scenario['streets'])
    street_num = random.randint(100, 2999)
    address = f"{street_num} {street}, {location['area']}"
    
    # Select emergency type
    emergency = random.choice(scenario['emergency_types'])
    
    # Generate summary (AI or template based on batch size)
    summary = generate_ai_summary(emergency['desc'], address, use_ai)
    
    # Calculate realistic metrics
    duration = calculate_duration(emergency['sev'])
    
    # Build call record
    call_record = {
        'call_id': call_id,
        'timestamp': ts,
        'created_at': datetime.now().isoformat(),
        
        # Location information
        'location': {
            'latitude': str(round(lat, 6)),
            'longitude': str(round(lon, 6)),
            'address': address,
            'area': location['area']
        },
        
        # Emergency details
        'emergency_type': emergency['type'],
        'severity': emergency['sev'],
        'description': emergency['desc'],
        'summary': summary,
        
        # Call metrics
        'duration_secs': duration,
        'caller_phone': generate_phone_number(),
        'status': random.choice(['active', 'dispatched', 'enroute', 'resolved']),
        
        # Metadata
        'simulation': True,
        'scenario': scenario_name,
        'scenario_name': scenario['name']
    }
    
    return call_record

def generate_ai_summary(emergency_desc, address, use_ai=True):
    """
    Generate summary - uses AI for small batches, templates for large batches
    """
    
    # For bulk operations (>20 calls), use templates to avoid throttling
    if not use_ai:
        templates = [
            f"Caller reported {emergency_desc} at {address}. Emergency services have been dispatched to the scene.",
            f"911 dispatch received report of {emergency_desc} at {address}. First responders en route with ETA 5-7 minutes.",
            f"Emergency call regarding {emergency_desc} at {address}. Fire and EMS units notified and responding.",
            f"Dispatch center received call about {emergency_desc} at {address}. Multiple units have been deployed.",
            f"Report of {emergency_desc} at {address}. Emergency personnel dispatched immediately to location.",
        ]
        return random.choice(templates)
    
    # For small batches (≤20 calls), use Bedrock AI for realistic variety
    prompt = f"Write a brief 2-sentence 911 dispatcher summary for: {emergency_desc} at {address}. Include emergency services dispatched."
    
    try:
        response = bedrock.invoke_model(
            modelId=DEFAULT_BEDROCK_MODEL,
            body=json.dumps({
                "anthropic_version": "bedrock-2023-05-31",
                "max_tokens": 200,
                "temperature": 0.8,
                "messages": [{
                    "role": "user",
                    "content": prompt
                }]
            })
        )
        
        result = json.loads(response['body'].read())
        return result['content'][0]['text'].strip()
        
    except Exception as e:
        print(f"Bedrock error (falling back to template): {e}")
        # Fallback to template
        templates = [
            f"Caller reported {emergency_desc} at {address}. Fire and EMS units dispatched to scene.",
            f"Emergency call regarding {emergency_desc} at {address}. First responders en route.",
        ]
        return random.choice(templates)

def calculate_duration(severity):
    """Calculate realistic call duration based on severity"""
    
    if severity == 'critical':
        return random.randint(120, 300)  # 2-5 minutes
    elif severity == 'high':
        return random.randint(90, 180)   # 1.5-3 minutes
    else:
        return random.randint(60, 120)   # 1-2 minutes

def generate_phone_number():
    """Generate realistic US phone number"""
    area_codes = ['310', '213', '424', '323', '818', '615']
    area_code = random.choice(area_codes)
    return f"+1{area_code}{random.randint(2000000, 9999999)}"