'use client';

import { useEffect, useState } from 'react';
import { correlationAPI } from '@/lib/api';
import { Scatter } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(LinearScale, PointElement, LineElement, Tooltip, Legend);

interface CorrelationChartProps {
  species: string;
  variable: string;
}

export default function CorrelationChart({ species, variable }: CorrelationChartProps) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await correlationAPI.getScatter(variable, { species });
        setData(res.data.data);
      } catch (error) {
        console.error('Failed to fetch scatter data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (species && variable) {
      fetchData();
    }
  }, [species, variable]);

  if (loading) {
    return <div className="text-center py-8">Loading chart...</div>;
  }

  const scatterData = {
    datasets: [
      {
        label: `${variable} vs Abundance`,
        data: data.map((d) => ({
          x: parseFloat(d[variable]),
          y: parseInt(d.abundance),
        })),
        backgroundColor: '#1890ff',
      },
    ],
  };

  const correlation = calculateCorrelation(
    data.map((d) => parseFloat(d[variable])),
    data.map((d) => parseInt(d.abundance))
  );

  return (
    <div>
      <div className="mb-4 p-4 bg-blue-50 rounded-lg">
        <p className="text-sm text-gray-700">
          <strong>Correlation Coefficient:</strong>{' '}
          <span className={correlation > 0 ? 'text-green-600' : 'text-red-600'}>
            {correlation.toFixed(4)}
          </span>
        </p>
        <p className="text-xs text-gray-600 mt-1">
          {Math.abs(correlation) > 0.7
            ? 'Strong correlation'
            : Math.abs(correlation) > 0.4
            ? 'Moderate correlation'
            : 'Weak correlation'}
        </p>
      </div>

      <Scatter
        data={scatterData}
        options={{
          responsive: true,
          scales: {
            x: {
              title: {
                display: true,
                text: variable.charAt(0).toUpperCase() + variable.slice(1),
              },
            },
            y: {
              title: {
                display: true,
                text: 'Abundance',
              },
            },
          },
        }}
      />
    </div>
  );
}

function calculateCorrelation(x: number[], y: number[]): number {
  const n = x.length;
  if (n === 0) return 0;

  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
  const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
  const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);

  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

  return denominator === 0 ? 0 : numerator / denominator;
}
