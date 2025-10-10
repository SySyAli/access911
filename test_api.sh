#!/bin/bash

echo "Testing Amazon API endpoints..."

echo "1. Testing GET with query params:"
curl -X GET "https://czwz6e7qje.execute-api.us-east-1.amazonaws.com/simulator?num_calls=5&scenario=nashville_tornado" -v

echo -e "\n2. Testing POST with JSON body:"
curl -X POST "https://czwz6e7qje.execute-api.us-east-1.amazonaws.com/simulator" \
  -H "Content-Type: application/json" \
  -d '{"num_calls": 5, "scenario": "nashville_tornado"}' \
  -v

echo -e "\n3. Testing base URL GET:"
curl -X GET "https://czwz6e7qje.execute-api.us-east-1.amazonaws.com" -v

echo -e "\n4. Testing base URL POST:"
curl -X POST "https://czwz6e7qje.execute-api.us-east-1.amazonaws.com" \
  -H "Content-Type: application/json" \
  -d '{"num_calls": 5, "scenario": "nashville_tornado"}' \
  -v

echo -e "\n5. Testing OPTIONS:"
curl -X OPTIONS "https://czwz6e7qje.execute-api.us-east-1.amazonaws.com/simulator" -v

echo -e "\n6. Testing HEAD:"
curl -I "https://czwz6e7qje.execute-api.us-east-1.amazonaws.com/simulator"

echo -e "\nDone testing!"
