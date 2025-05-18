'use client';

import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface ErrorChartProps {
  data: any;
}

export default function ErrorChart({ data }: ErrorChartProps) {
  const { erroredUrls } = data || { erroredUrls: [] };
  
  // Process the errored URLs to group by endpoint and count
  const endpointCounts: Record<string, number> = {};
  
  erroredUrls.forEach((error: any) => {
    const endpoint = error.endpoint || 'Unknown';
    endpointCounts[endpoint] = (endpointCounts[endpoint] || 0) + error.count;
  });
  
  const labels = Object.keys(endpointCounts);
  const counts = Object.values(endpointCounts);
  
  const chartData = {
    labels,
    datasets: [
      {
        label: 'Error Count',
        data: counts,
        backgroundColor: 'rgba(255, 99, 132, 0.7)',
        borderColor: 'rgba(255, 99, 132, 1)',
        borderWidth: 1,
      },
    ],
  };
  
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            return `Errors: ${context.raw}`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Error Count'
        }
      },
      x: {
        title: {
          display: true,
          text: 'Endpoint'
        }
      }
    }
  };
  
  if (erroredUrls.length === 0) {
    return <div className="flex items-center justify-center h-full">No errors detected</div>;
  }
  
  return <Bar data={chartData} options={options} />;
}