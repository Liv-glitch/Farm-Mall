#!/bin/bash

# Test script for health assessment upload endpoint
# Make sure to replace YOUR_JWT_TOKEN with actual token

echo "Testing Plant Health Assessment Upload Endpoint"
echo "=============================================="

# First, get a JWT token (replace with your actual login credentials)
echo "1. Getting authentication token..."
TOKEN_RESPONSE=$(curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your-email@example.com",
    "password": "your-password"
  }')

# Extract token (you'll need jq installed: brew install jq)
TOKEN=$(echo $TOKEN_RESPONSE | jq -r '.data.accessToken')

echo "2. Testing health assessment with uploaded image..."

# Test the health assessment endpoint
curl -X POST http://localhost:3000/api/v1/ai/health-assessment/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "image=@uploads/test-images/plague.jpg" \
  -F "cropType=potato" \
  -F "location={\"latitude\": -0.2367, \"longitude\": 37.6531}" \
  -F "farmingStage=flowering" \
  -F "symptoms=[\"leaf spots\", \"purple discoloration\", \"disease symptoms\"]" \
  | jq '.'

echo ""
echo "Test completed!" 