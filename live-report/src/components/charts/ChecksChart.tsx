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
  ArcElement,
} from 'chart.js';
import { Pie } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

interface ChecksChartProps {
  data: any;
}

export default function ChecksChart({ data }: ChecksChartProps) {
  const { metrics } = data || {};
  
  // Extract checks data
  const passes = metrics?.checks?.values?.passes || 0;
  const fails = metrics?.checks?.values?.fails || 0;
  
  const chartData = {
    labels: ['Passed', 'Failed'],
    datasets: [
      {
        data: [passes, fails],
        backgroundColor: [
          'rgba(75, 192, 192, 0.7)', // Green for passed
          'rgba(255, 99, 132, 0.7)', // Red for failed
        ],
        borderColor: [
          'rgba(75, 192, 192, 1)', 
          'rgba(255, 99, 132, 1)',
        ],
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
            const label = context.label || '';
            const value = context.raw || 0;
            const total = passes + fails;
            const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
            return `${label}: ${value} (${percentage}%)`;
          }
        }
      }
    },
  };
  
  if (passes === 0 && fails === 0) {
    return <div className="flex items-center justify-center h-full">No checks data available</div>;
  }
  
  return <Pie data={chartData} options={options} />;
}