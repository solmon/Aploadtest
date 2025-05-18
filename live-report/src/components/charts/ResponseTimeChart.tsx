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

interface ResponseTimeChartProps {
  data: any;
}

export default function ResponseTimeChart({ data }: ResponseTimeChartProps) {
  const { metrics } = data || {};
  
  // Extract response time data if available
  const respTimeSeries = metrics?.http_req_duration?.values?.timeSeries || [];
  const respData = respTimeSeries.map((point: any) => ({
    x: point.time,
    y: point.value,
    name: point.tags?.name || 'Unknown'
  })).sort((a: any, b: any) => a.x - b.x);

  // Format time labels
  const timeLabels = respData.map((d: any) => new Date(d.x).toLocaleTimeString());
  
  // Group the data by endpoint name for different colored lines
  const endpointNames = Array.from(new Set(respData.map((d: any) => d.name)));
  
  const datasets = endpointNames.map((name, index) => {
    const color = getColor(index);
    const filteredData = respData.filter((d: any) => d.name === name);
    
    return {
      label: name,
      data: filteredData.map((d: any) => d.y),
      borderColor: color,
      backgroundColor: `${color}50`, // 50 = 30% opacity in hex
      tension: 0.2,
      hidden: index > 3 // Only show first 4 endpoints by default to avoid clutter
    };
  });
  
  const chartData = {
    labels: timeLabels,
    datasets
  };
  
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Response Time (ms)'
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
  
  if (respData.length === 0) {
    return <div className="flex items-center justify-center h-full">No response time data available</div>;
  }
  
  return <Line data={chartData} options={options} />;
}

// Helper function to get a color from an index
function getColor(index: number): string {
  const colors = [
    'rgb(53, 162, 235)', // blue
    'rgb(255, 99, 132)', // red
    'rgb(75, 192, 192)', // green
    'rgb(255, 159, 64)', // orange
    'rgb(153, 102, 255)', // purple
    'rgb(201, 203, 207)', // grey
    'rgb(255, 205, 86)', // yellow
  ];
  
  return colors[index % colors.length];
}