'use client';

import React from 'react';
import { useSocket } from './SocketProvider';
import { 
  RequestsChart, 
  ResponseTimeChart, 
  ChecksChart,
  ErrorChart
} from './charts';

export default function Dashboard() {
  const { testData, isConnected } = useSocket();

  if (!isConnected) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-xl font-semibold">Connecting to server...</div>
          <div className="text-sm text-gray-500">Waiting for connection</div>
        </div>
      </div>
    );
  }

  if (!testData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-xl font-semibold">Waiting for test data...</div>
          <div className="text-sm text-gray-500">No data available yet</div>
        </div>
      </div>
    );
  }

  const { metrics = {}, erroredUrls = [], processedAt } = testData;
  
  // Extract key metrics
  const httpReqs = metrics.http_reqs?.values?.count || 0;
  const httpFailed = metrics.http_req_failed?.values?.passes || 0;
  const httpAvgDuration = metrics.http_req_duration?.values?.avg?.toFixed(2) || 0;
  const httpP95Duration = metrics.http_req_duration?.values?.p95?.toFixed(2) || 0;
  const httpMaxDuration = metrics.http_req_duration?.values?.max?.toFixed(2) || 0;
  const checksRate = metrics.checks?.values?.rate || 0;
  const checksPasses = metrics.checks?.values?.passes || 0;
  const checksFails = metrics.checks?.values?.fails || 0;
  const vusMax = metrics.vus_max?.values?.value || 0;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-blue-700">K6 Load Test Live Report</h1>
        <p className="text-gray-600">
          Last updated: {new Date(processedAt).toLocaleString()}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {/* Key metrics cards */}
        <MetricCard 
          title="Total Requests" 
          value={httpReqs.toLocaleString()} 
        />
        
        <MetricCard 
          title="Failed Requests" 
          value={httpFailed.toLocaleString()}
          className={httpFailed > 0 ? "text-red-600" : "text-green-600"}
        />
        
        <MetricCard 
          title="Checks Success Rate" 
          value={`${(checksRate * 100).toFixed(2)}%`}
          className={
            checksRate >= 0.95 
              ? "text-green-600" 
              : checksRate >= 0.9 
                ? "text-yellow-600" 
                : "text-red-600"
          }
        />
        
        <MetricCard 
          title="Average Response Time" 
          value={`${httpAvgDuration} ms`}
        />
        
        <MetricCard 
          title="95th Percentile" 
          value={`${httpP95Duration} ms`}
        />
        
        <MetricCard 
          title="Max Response Time" 
          value={`${httpMaxDuration} ms`}
        />
        
        <MetricCard 
          title="Virtual Users (Max)" 
          value={vusMax.toString()}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Requests Over Time</h2>
          <div className="h-80">
            <RequestsChart data={testData} />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Response Times</h2>
          <div className="h-80">
            <ResponseTimeChart data={testData} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Checks</h2>
          <div className="h-80">
            <ChecksChart data={testData} />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Errors by Endpoint</h2>
          <div className="h-80">
            <ErrorChart data={testData} />
          </div>
        </div>
      </div>

      {/* Failed Request URLs table */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Failed Request URLs</h2>
        
        {erroredUrls.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Endpoint
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    URL
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Count
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {erroredUrls.map((error: any, index: number) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{error.endpoint}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{error.url}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{error.status}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{error.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-gray-500">No failed requests detected.</p>
          </div>
        )}
      </div>

      {/* HTTP Request Details table */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">HTTP Request Details</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Metric
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Value
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              <tr>
                <td className="px-6 py-4 text-sm font-medium text-gray-900">Total Requests</td>
                <td className="px-6 py-4 text-sm text-gray-500">{httpReqs.toLocaleString()}</td>
              </tr>
              <tr>
                <td className="px-6 py-4 text-sm font-medium text-gray-900">Failed Requests</td>
                <td className="px-6 py-4 text-sm text-gray-500">{httpFailed.toLocaleString()}</td>
              </tr>
              <tr>
                <td className="px-6 py-4 text-sm font-medium text-gray-900">Average Duration</td>
                <td className="px-6 py-4 text-sm text-gray-500">{httpAvgDuration} ms</td>
              </tr>
              <tr>
                <td className="px-6 py-4 text-sm font-medium text-gray-900">95th Percentile</td>
                <td className="px-6 py-4 text-sm text-gray-500">{httpP95Duration} ms</td>
              </tr>
              <tr>
                <td className="px-6 py-4 text-sm font-medium text-gray-900">Maximum Duration</td>
                <td className="px-6 py-4 text-sm text-gray-500">{httpMaxDuration} ms</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ title, value, className = "text-blue-700" }: { title: string; value: string; className?: string }) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-medium text-gray-700">{title}</h3>
      <div className={`text-3xl font-bold mt-2 ${className}`}>
        {value}
      </div>
    </div>
  );
}