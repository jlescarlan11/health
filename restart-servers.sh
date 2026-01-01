#!/bin/bash
# Bash script to restart both backend and Expo servers with cache cleared

echo "Stopping any running Node processes..."

# Kill processes on port 3000 (backend)
lsof -ti:3000 | xargs kill -9 2>/dev/null && echo "Stopped backend server" || echo "No backend server running"

# Kill Expo processes
pkill -f "expo start" 2>/dev/null && echo "Stopped Expo server" || echo "No Expo server running"

sleep 2

echo ""
echo "Starting backend server..."
cd backend
npm run dev &
BACKEND_PID=$!
cd ..

sleep 3

echo "Starting Expo server with cleared cache..."
npx expo start --clear &
EXPO_PID=$!

echo ""
echo "✓ Both servers are starting"
echo ""
echo "Backend PID: $BACKEND_PID"
echo "Expo PID: $EXPO_PID"
echo ""
echo "Note: Make sure your local IP is correct in app.config.js"
echo "Run 'node get-local-ip.js' to get your current IP address"
echo ""
echo "To stop servers, press Ctrl+C or run: kill $BACKEND_PID $EXPO_PID"



