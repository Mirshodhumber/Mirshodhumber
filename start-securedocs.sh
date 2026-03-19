#!/bin/bash

echo "=========================================="
echo "SecureDocs Application Startup"
echo "=========================================="
echo ""

# Check if MongoDB is running
echo "Checking MongoDB connection..."

if ! lsof -i :27017 > /dev/null
then
  echo "MongoDB does not appear to be running."
  echo "Please start MongoDB before running this application."
  exit 1
fi

echo "MongoDB detected."
echo ""

# Start Backend
echo "Starting SecureDocs Backend..."

cd securedocs-backend || exit

if [ ! -d "node_modules" ]; then
  echo "Installing backend dependencies..."
  npm install
fi

echo "Launching backend..."
npm run dev &

BACKEND_PID=$!

cd ..

sleep 4

echo ""
echo "Backend started."

# Start Frontend
echo "Starting SecureDocs Angular Frontend..."

cd securedocs-frontend || exit

if [ ! -d "node_modules" ]; then
  echo "Installing frontend dependencies..."
  npm install
fi

echo "Launching frontend..."
npm start &

FRONTEND_PID=$!

cd ..

sleep 6

echo ""
echo "Opening application in browser..."

# macOS browser open
if [[ "$OSTYPE" == "darwin"* ]]; then
  open http://localhost:4200
else
  xdg-open http://localhost:4200
fi

echo ""
echo "=========================================="
echo "SecureDocs started successfully"
echo "Backend:  http://localhost:3000"
echo "Frontend: http://localhost:4200"
echo "=========================================="
echo ""

wait