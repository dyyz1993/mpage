#!/bin/bash

set -e

PORT=8054
BASE_URL="http://localhost:$PORT"

echo "=== Session Daemon Verification ==="

# Kill existing daemon
pkill -f "session-daemon" 2>/dev/null || true
sleep 1

# Start daemon
echo "Starting daemon..."
cd /Users/xuyingzhou/Project/study-node-ts/mpage
node xcli/dist/session-daemon.cjs &
DAEMON_PID=$!
sleep 3

# Check daemon is running
if ! lsof -i:$PORT | grep -q node; then
  echo "FAIL: Daemon not running"
  exit 1
fi
echo "OK: Daemon running (PID: $DAEMON_PID)"

# Test 1: API health check
echo ""
echo "Test 1: API health check"
curl -s "$BASE_URL/api/sessions" | grep -q "^\[" && echo "OK: API responding" || echo "FAIL: API not responding"

# Test 2: Create session 'test1'
echo ""
echo "Test 2: Create session 'test1'"
RESP=$(curl -s -X POST "$BASE_URL/rpc" -H "Content-Type: application/json" -d '{"method":"open","params":{"name":"test1","url":"https://example.com"}}')
echo "Response: $RESP"
echo "$RESP" | grep -q '"id"' && echo "OK: Session created" || echo "FAIL: Session not created"

# Test 3: Create session 'test2'
echo ""
echo "Test 3: Create session 'test2'"
RESP=$(curl -s -X POST "$BASE_URL/rpc" -H "Content-Type: application/json" -d '{"method":"open","params":{"name":"test2","url":"https://baidu.com"}}')
echo "Response: $RESP"
echo "$RESP" | grep -q '"id"' && echo "OK: Session created" || echo "FAIL: Session not created"

# Test 4: List sessions
echo ""
echo "Test 4: List sessions"
SESSIONS=$(curl -s "$BASE_URL/api/sessions")
echo "Sessions: $SESSIONS"
echo "$SESSIONS" | grep -q "test1" && echo "OK: test1 found" || echo "FAIL: test1 not found"
echo "$SESSIONS" | grep -q "test2" && echo "OK: test2 found" || echo "FAIL: test2 not found"

# Test 5: Viewer HTML accessible
echo ""
echo "Test 5: Viewer HTML accessible"
HTML=$(curl -s "$BASE_URL/viewer.html")
echo "$HTML" | grep -q "XCLI Viewer" && echo "OK: Viewer HTML accessible" || echo "FAIL: Viewer HTML not accessible"

# Cleanup
echo ""
echo "Cleanup..."
curl -s -X POST "$BASE_URL/rpc" -H "Content-Type: application/json" -d '{"method":"closeAll","params":{}}' > /dev/null
kill $DAEMON_PID 2>/dev/null || true

echo ""
echo "=== Verification Complete ==="