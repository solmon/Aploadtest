'use client';

import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface RequestsChartProps {
  data: any;
}

export default function RequestsChart({ data }: RequestsChartProps) {
  const { metrics } = data || {};
  
  // Extract VUs over time if available
  const vusTimeSeries = metrics?.vus?.values?.timeSeries || [];
  const vusData = vusTimeSeries.map((point: any) => ({
    x: point.time,
    y: point.value
  })).sort((a: any, b: any) => a.x - b.x);

  // Format time labels
  const timeLabels = vusData.map((d: any) => new Date(d.x).toLocaleTimeString());
  
  const chartData = {
    labels: timeLabels,
    datasets: [
      {
        label: 'Virtual Users',
        data: vusData.map((d: any) => d.y),
        borderColor: 'rgb(53, 162, 235)',
        backgroundColor: 'rgba(53, 162, 235, 0.5)',
        tension: 0.2,
      }
    ],
  };
  
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Number of VUs'
        }
      },
      x: {
        title: {
          display: true,
          text: 'Time'
        },
        ticks: {
          maxTicksLimit: 10,
          callback: function(val: any, index: number) {
            // Use a reduced number of labels for readability
            return index % Math.ceil(timeLabels.length / 10) === 0 ? timeLabels[index] : '';
          }
        }
      }
    },
  };
  
  if (vusData.length === 0) {
    return <div className="flex items-center justify-center h-full">No VUs data available</div>;
  }
  
  return <Line data={chartData} options={options} />;
}