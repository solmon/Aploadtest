#!/bin/bash

# Start the Next.js live report server in the background
echo "Starting live report server..."
cd live-report
npm run dev &
LIVE_PID=$!

# Wait for the server to start
echo "Waiting for live report server to start..."
sleep 5

# Open the browser to the live report
echo "Opening live report in browser..."
xdg-open http://localhost:3000 &

# Wait a moment before starting the test
echo "Starting load test..."
cd ..

# Run the k6 load test with output to results.json
k6 run -o json=results.json logintest.js

# When the test is done, wait for user input before shutting down
echo "Test completed! The live report server is still running."
echo "Press Enter to shut down the live report server..."
read

# Kill the live report server
kill $LIVE_PID
echo "Live report server has been shut down."