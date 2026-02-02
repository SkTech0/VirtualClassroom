#!/usr/bin/env bash
# E2E test script for meeting flow (API + auth + room). Run with backend up.
# Usage: ./test-meeting-e2e.sh

set -e
BASE="${BASE_URL:-http://localhost:5275/api/v1}"

echo "=== Meeting E2E (API) — Base: $BASE ==="

# Register two users
register() {
  local email="$1"
  local name="$2"
  curl -s -X POST "$BASE/auth/register" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$email\",\"password\":\"Pass123!\",\"userName\":\"$name\"}" \
    | jq -r '.accessToken // empty'
}

TOKEN_A=$(register "meet1@test.com" "MeetUser1")
TOKEN_B=$(register "meet2@test.com" "MeetUser2")

if [ -z "$TOKEN_A" ] || [ -z "$TOKEN_B" ]; then
  echo "FAIL: Could not register users (maybe already exist; try different emails or reset DB)"
  exit 1
fi
echo "OK: Two users registered"

# Create room (User A)
ROOM_JSON=$(curl -s -X POST "$BASE/rooms/create" \
  -H "Authorization: Bearer $TOKEN_A" \
  -H "Content-Type: application/json" \
  -d '{"subject":"E2E Meeting Room"}')
CODE=$(echo "$ROOM_JSON" | jq -r '.code // empty')
if [ -z "$CODE" ]; then
  echo "FAIL: Create room failed: $ROOM_JSON"
  exit 1
fi
echo "OK: Room created with code: $CODE"

# Join room (User B)
JOIN=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/rooms/join" \
  -H "Authorization: Bearer $TOKEN_B" \
  -H "Content-Type: application/json" \
  -d "{\"code\":\"$CODE\"}")
if [ "$JOIN" != "200" ]; then
  echo "FAIL: Join room returned HTTP $JOIN"
  exit 1
fi
echo "OK: User B joined room"

# Optional: GET room by code
ROOM_GET=$(curl -s -X GET "$BASE/rooms/code/$CODE" -H "Authorization: Bearer $TOKEN_A")
SUBJECT=$(echo "$ROOM_GET" | jq -r '.subject // empty')
if [ -z "$SUBJECT" ]; then
  echo "WARN: GET room by code failed or empty"
else
  echo "OK: GET room by code: $SUBJECT"
fi

echo "=== API E2E passed. Next: run manual E2E (MEETING_E2E_CHECKLIST.md) in two browsers. ==="
