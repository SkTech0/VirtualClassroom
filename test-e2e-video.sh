#!/bin/sh
# E2E video flow: Register -> Create room -> Output instructions for testing Start Video Call in browser.
# Run after: docker compose up -d postgres redis && dotnet run (VirtualClassroom.Backend) && ng serve (live-study-room)
set -e
BASE="${API_BASE:-http://localhost:5275/api/v1}"
TS=$(date +%s)
EMAIL="e2evideo${TS}@test.com"
USER="e2evideo${TS}"
PASS="Test123!"

echo "=== 1. Register user ==="
R1=$(curl -s -X POST "$BASE/auth/register" -H "Content-Type: application/json" -d "{\"email\":\"$EMAIL\",\"username\":\"$USER\",\"password\":\"$PASS\"}")
TOKEN=$(echo "$R1" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
[ -z "$TOKEN" ] && { echo "FAIL: Register - $R1"; exit 1; }
echo "OK"

echo "=== 2. Create room ==="
R2=$(curl -s -w "\n%{http_code}" -X POST "$BASE/rooms/create" -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" -d '{"subject":"Video E2E"}')
CODE_HTTP=$(echo "$R2" | tail -1)
BODY2=$(echo "$R2" | sed '$d')
ROOM_CODE=$(echo "$BODY2" | grep -o '"code":"[^"]*"' | cut -d'"' -f4)
[ -z "$ROOM_CODE" ] && { echo "FAIL: Create room (HTTP $CODE_HTTP) - $BODY2"; exit 1; }
echo "OK - Room code: $ROOM_CODE"

echo "=== 3. GET room by code (verify room exists) ==="
R3=$(curl -s -w "\n%{http_code}" -X GET "$BASE/rooms/$ROOM_CODE" -H "Authorization: Bearer $TOKEN")
CODE_GET=$(echo "$R3" | tail -1)
[ "$CODE_GET" != "200" ] && { echo "FAIL: Get room (HTTP $CODE_GET)"; exit 1; }
echo "OK"

echo ""
echo "=== Video E2E setup OK ==="
echo "  Room code: $ROOM_CODE"
echo "  Frontend: http://localhost:4200 (ensure ng serve is running)"
echo "  Test in browser:"
echo "    1. Login with $EMAIL / $PASS"
echo "    2. Open room: http://localhost:4200/room/$ROOM_CODE"
echo "    3. Click 'Video Call' tab -> 'Start Video Call'"
echo "    4. Allow camera/mic; you should land on /video/$ROOM_CODE and join the call"
