'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useTheme } from '@/lib/theme-provider';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  TimeScale,
  Tooltip,
  Legend,
  ChartOptions,
} from 'chart.js';
import { CandlestickController, CandlestickElement } from 'chartjs-chart-financial';
import 'chartjs-adapter-date-fns';

// Define the financial data type
interface FinancialData {
  x: number;
  o: number;
  h: number;
  l: number;
  c: number;
}

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  TimeScale,
  Tooltip,
  Legend,
  CandlestickController,
  CandlestickElement
);

interface CandlestickChartProps {
  data: {
    timestamp: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }[];
  timeframe: '15m' | '1d';
  height?: number;
}

export function CandlestickChart({ data, timeframe, height = 300 }: CandlestickChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<ChartJS<'candlestick'> | null>(null);
  const { theme, resolvedTheme } = useTheme();
  
  // Get the actual theme (handles 'auto' case)
  const currentTheme = resolvedTheme || theme || 'light';

  // Theme-aware colors
  const getThemeColors = useCallback(() => {
    const isDark = currentTheme === 'dark';
    
    return {
      // Grid and axis colors
      gridColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
      tickColor: isDark ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.6)',
      
      // Tooltip colors
      tooltipBg: isDark ? 'hsl(222.2, 84%, 4.9%)' : 'hsl(0, 0%, 100%)',
      tooltipBorder: isDark ? 'hsl(217.2, 32.6%, 17.5%)' : 'hsl(214.3, 31.8%, 91.4%)',
      tooltipText: isDark ? 'hsl(210, 40%, 98%)' : 'hsl(222.2, 84%, 4.9%)',
      
      // Candlestick colors
      bullish: {
        fill: isDark ? '#10b981' : '#059669', // green-500 for dark, green-600 for light
        border: isDark ? '#34d399' : '#047857', // green-400 for dark, green-700 for light
      },
      bearish: {
        fill: isDark ? '#ef4444' : '#dc2626', // red-500 for dark, red-600 for light
        border: isDark ? '#f87171' : '#b91c1c', // red-400 for dark, red-700 for light
      }
    };
  }, [currentTheme]);

  useEffect(() => {
    if (!canvasRef.current || !data || data.length === 0) return;

    // Destroy existing chart
    if (chartRef.current) {
      chartRef.current.destroy();
    }

    // Process data for Chart.js financial
    const chartData: FinancialData[] = data.map(item => ({
      x: item.timestamp,
      o: item.open,
      h: item.high,
      l: item.low,
      c: item.close,
    }));

    const colors = getThemeColors();

    const options: ChartOptions<'candlestick'> = {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        intersect: false,
        mode: 'index',
      },
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          backgroundColor: colors.tooltipBg,
          titleColor: colors.tooltipText,
          bodyColor: colors.tooltipText,
          borderColor: colors.tooltipBorder,
          borderWidth: 1,
          cornerRadius: 8,
          displayColors: false,
          callbacks: {
            title: (context) => {
              const dataPoint = context[0];
              if (dataPoint && 'parsed' in dataPoint) {
                const timestamp = (dataPoint.parsed as any).x;
                const date = new Date(timestamp);
                return timeframe === '15m' 
                  ? date.toLocaleTimeString('en-US', { 
                      hour: '2-digit', 
                      minute: '2-digit',
                      hour12: false 
                    })
                  : date.toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric' 
                    });
              }
              return '';
            },
            label: (context) => {
              const dataPoint = context.parsed as any;
              if (dataPoint && typeof dataPoint === 'object') {
                const isGreen = dataPoint.c >= dataPoint.o;
                return [
                  `Open: $${dataPoint.o?.toFixed(2) || '0.00'}`,
                  `High: $${dataPoint.h?.toFixed(2) || '0.00'}`,
                  `Low: $${dataPoint.l?.toFixed(2) || '0.00'}`,
                  `Close: $${dataPoint.c?.toFixed(2) || '0.00'} ${isGreen ? '↗' : '↘'}`,
                ];
              }
              return [];
            },
          },
        },
      },
      scales: {
        x: {
          type: 'time',
          time: {
            unit: timeframe === '15m' ? 'minute' : 'day',
            displayFormats: {
              minute: 'HH:mm',
              day: 'MMM dd',
            },
          },
          // Show appropriate time range based on actual data
          min: timeframe === '15m' 
            ? chartData.length > 0 ? new Date(Math.min(...chartData.map(d => d.x))).toISOString() : new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString()
            : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days ago
          max: timeframe === '15m' 
            ? chartData.length > 0 ? new Date(Math.max(...chartData.map(d => d.x))).toISOString() : undefined
            : undefined,
          grid: {
            color: colors.gridColor,
          },
          ticks: {
            color: colors.tickColor,
            maxTicksLimit: timeframe === '15m' ? 6 : 6, // Fewer ticks for 8-hour range
          },
        },
        y: {
          grid: {
            color: colors.gridColor,
          },
          ticks: {
            color: colors.tickColor,
            callback: function(value) {
              return '$' + Number(value).toFixed(2);
            },
          },
        },
      },
    };

    chartRef.current = new ChartJS(canvasRef.current, {
      type: 'candlestick',
      data: {
        datasets: [
          {
            label: 'Price',
            data: chartData,
            borderColor: (ctx: any) => {
              const data = ctx.parsed;
              if (data.c >= data.o) {
                return colors.bullish.border;
              } else {
                return colors.bearish.border;
              }
            },
            backgroundColor: (ctx: any) => {
              const data = ctx.parsed;
              if (data.c >= data.o) {
                return colors.bullish.fill;
              } else {
                return colors.bearish.fill;
              }
            },
            borderWidth: 1,
          },
        ],
      },
      options,
    });

    // Cleanup function
    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
      }
    };
  }, [data, timeframe, currentTheme, getThemeColors]);

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <div className="text-center">
          <p>No chart data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full" style={{ height }}>
      <canvas ref={canvasRef} />
    </div>
  );
}
