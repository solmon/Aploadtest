'use client';

import { SocketProvider } from '../components/SocketProvider';
import Dashboard from '../components/Dashboard';

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      <SocketProvider>
        <Dashboard />
      </SocketProvider>
    </div>
  );
}
