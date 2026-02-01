#!/bin/sh
# E2E: Register -> Create Room -> Join Room (run after: docker compose up -d postgres redis && dotnet run from VirtualClassroom.Backend)
set -e
BASE="${API_BASE:-http://localhost:5275/api/v1}"
TS=$(date +%s)
EMAIL1="e2ea${TS}@test.com"; USER1="e2ea${TS}"; PASS="Test123!"
EMAIL2="e2eb${TS}@test.com"; USER2="e2eb${TS}"; PASS="Test123!"

echo "=== 1. Register User A ==="
R1=$(curl -s -X POST "$BASE/auth/register" -H "Content-Type: application/json" -d "{\"email\":\"$EMAIL1\",\"username\":\"$USER1\",\"password\":\"$PASS\"}")
TOKEN_A=$(echo "$R1" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
[ -z "$TOKEN_A" ] && { echo "FAIL: Register A - $R1"; exit 1; }
echo "OK"

echo "=== 2. Create Room (User A) ==="
R2=$(curl -s -w "\n%{http_code}" -X POST "$BASE/rooms/create" -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN_A" -d '{"subject":"E2E Math"}')
CODE=$(echo "$R2" | tail -1); BODY=$(echo "$R2" | sed '$d')
ROOM_CODE=$(echo "$BODY" | grep -o '"code":"[^"]*"' | cut -d'"' -f4)
[ -z "$ROOM_CODE" ] && { echo "FAIL: Create room (HTTP $CODE) - $BODY"; exit 1; }
echo "OK - Room: $ROOM_CODE"

echo "=== 3. Register User B ==="
R3=$(curl -s -X POST "$BASE/auth/register" -H "Content-Type: application/json" -d "{\"email\":\"$EMAIL2\",\"username\":\"$USER2\",\"password\":\"$PASS\"}")
TOKEN_B=$(echo "$R3" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
[ -z "$TOKEN_B" ] && { echo "FAIL: Register B"; exit 1; }
echo "OK"

echo "=== 4. Join Room (User B) ==="
R4=$(curl -s -w "\n%{http_code}" -X POST "$BASE/rooms/join" -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN_B" -d "{\"code\":\"$ROOM_CODE\"}")
CODE_JOIN=$(echo "$R4" | tail -1)
[ "$CODE_JOIN" != "200" ] && { echo "FAIL: Join (HTTP $CODE_JOIN)"; exit 1; }
echo "OK"

echo ""
echo "=== E2E OK: Login -> Create Room -> Join Room ==="
