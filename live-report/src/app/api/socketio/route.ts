import { NextRequest } from 'next/server';

// This endpoint is just a pass-through for the Socket.IO connection.
// The actual WebSocket handling is done in the custom server.js
export async function GET(request: NextRequest) {
  return new Response('Socket.IO endpoint', {
    status: 200,
  });
}