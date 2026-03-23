#!/bin/bash
cd "e:\Projects\using_YT\marine-data-platform\backend"

# Kill old process if exists
lsof -ti:3001 2>/dev/null | xargs kill -9 2>/dev/null || true

# Start backend
npm run dev 2>&1 &
BACKEND_PID=$!

# Wait for backend to start
echo "Waiting for backend to start..."
for i in {1..30}; do
  if curl -s http://localhost:3001/health > /dev/null 2>&1; then
    echo "Backend is ready!"
    break
  fi
  if [ $i -eq 30 ]; then
    echo "Backend failed to start"
    kill $BACKEND_PID
    exit 1
  fi
  sleep 1
done

# Test API endpoints
echo ""
echo "=== Testing API Endpoints ==="
echo ""

echo "Testing /api/ocean"
curl -s "http://localhost:3001/api/ocean?limit=1" | head -20

echo ""
echo "Testing /api/fisheries"
curl -s "http://localhost:3001/api/fisheries?limit=1" | head -20

echo ""
echo "Testing /api/fisheries/metrics"
curl -s "http://localhost:3001/api/fisheries/metrics" | head -20

wait $BACKEND_PID
