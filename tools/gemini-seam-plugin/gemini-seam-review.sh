#!/bin/bash

# A script to feed seam contracts and probes to the Gemini API for automated architectural review.
# Usage: ./gemini-seam-review.sh <seamId>

SEAM_ID=$1
if [ -z "$SEAM_ID" ]; then
  echo "Usage: ./gemini-seam-review.sh <seamId>"
  return 1 2>/dev/null || true
fi

if [ -z "$GEMINI_API_KEY" ]; then
  echo "Error: GEMINI_API_KEY is not set in the environment."
  return 1 2>/dev/null || true
fi

# Fetch registry using our CLI
REGISTRY=$(node ../seam-cli/index.js registry 2>/dev/null)
if ! echo "$REGISTRY" | grep -q "$SEAM_ID"; then
   echo "Error: Seam '$SEAM_ID' not found."
   return 1 2>/dev/null || true
fi

# We'll just read the JSON file to parse it natively in bash via grep/awk to avoid jq dependency
CONTRACT_FILE=$(grep -A 10 "\"id\": \"$SEAM_ID\"" ../../seam-registry.json | grep "\"contract\":" | cut -d '"' -f 4)

if [ -z "$CONTRACT_FILE" ]; then
   echo "No contract found for $SEAM_ID."
   return 1 2>/dev/null || true
fi

if [ ! -f "../../$CONTRACT_FILE" ]; then
   echo "Contract file ../../$CONTRACT_FILE does not exist."
   return 1 2>/dev/null || true
fi

echo "Analyzing contract for $SEAM_ID..."

CONTRACT_CONTENT=$(cat "../../$CONTRACT_FILE" | sed 's/"/\\"/g' | awk '{printf "%s\\n", $0}')

PROMPT="You are an expert software architect reviewing an I/O boundary (a 'seam'). Review this TypeScript contract and ensure it follows Continuous Seam-Driven Development principles: 1) It uses the SeamResult error wrapper, 2) It does not leak underlying implementation details (e.g., raw HTTP responses or SQL errors), 3) The input/output models are pure domain objects. Contract:\\n\\n$CONTRACT_CONTENT"

# Make the request to Gemini
curl -s "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=$GEMINI_API_KEY" \
    -H 'Content-Type: application/json' \
    -X POST \
    -d '{
      "contents": [{
        "parts":[{
          "text": "'"$PROMPT"'"
        }]
      }]
    }' | grep -o '"text": "[^"]*' | cut -d'"' -f4- || echo "Failed to reach Gemini or parse response."
