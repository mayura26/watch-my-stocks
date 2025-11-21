'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useTheme } from '@/lib/theme-provider';
import { createChart, IChartApi, ISeriesApi, ColorType, Time } from 'lightweight-charts';

interface CandlestickChartProps {
  data: {
    timestamp: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }[];
  timeframe: '1h' | '1d' | '1M' | '1Y';
  height?: number;
}

export function CandlestickChart({ data, timeframe, height = 300 }: CandlestickChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const { theme, resolvedTheme } = useTheme();
  
  // Get the actual theme (handles 'auto' case)
  const currentTheme = resolvedTheme || theme || 'light';

  // Theme-aware colors
  const getThemeColors = useCallback(() => {
    const isDark = currentTheme === 'dark';
    
    return {
      // Chart background
      layoutBackground: isDark ? '#0a0a0a' : '#ffffff',
      layoutText: isDark ? '#d1d5db' : '#1f2937',
      
      // Grid colors
      gridColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
      
      // Candlestick colors
      bullish: {
        upColor: isDark ? '#10b981' : '#059669',
        downColor: isDark ? '#ef4444' : '#dc2626',
        borderUpColor: isDark ? '#34d399' : '#047857',
        borderDownColor: isDark ? '#f87171' : '#b91c1c',
      },
      
      // Crosshair
      crosshairColor: isDark ? '#6b7280' : '#9ca3af',
    };
  }, [currentTheme]);

  useEffect(() => {
    if (!chartContainerRef.current || !data || data.length === 0) return;

    // Destroy existing chart
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
      seriesRef.current = null;
    }

    const colors = getThemeColors();

    // Get container width, ensuring we have a valid width
    const containerWidth = chartContainerRef.current.clientWidth || chartContainerRef.current.offsetWidth || 800;

    // Create chart
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: colors.layoutBackground },
        textColor: colors.layoutText,
      },
      grid: {
        vertLines: { color: colors.gridColor },
        horzLines: { color: colors.gridColor },
      },
      width: containerWidth,
      height: height,
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: colors.gridColor,
      },
      rightPriceScale: {
        borderColor: colors.gridColor,
      },
      crosshair: {
        mode: 0, // Normal crosshair
        vertLine: {
          color: colors.crosshairColor,
          width: 1,
          style: 0,
        },
        horzLine: {
          color: colors.crosshairColor,
          width: 1,
          style: 0,
        },
      },
    });

    // Create candlestick series
    const candlestickSeries = chart.addCandlestickSeries({
      upColor: colors.bullish.upColor,
      downColor: colors.bullish.downColor,
      borderVisible: true,
      wickUpColor: colors.bullish.borderUpColor,
      wickDownColor: colors.bullish.borderDownColor,
      borderUpColor: colors.bullish.borderUpColor,
      borderDownColor: colors.bullish.borderDownColor,
    });

    // Convert data to TradingView format
    // TradingView expects time as Unix timestamp in seconds
    const chartData = data.map(item => ({
      time: (item.timestamp / 1000) as Time,
      open: item.open,
      high: item.high,
      low: item.low,
      close: item.close,
    }));

    // Set data
    candlestickSeries.setData(chartData);

    // Format price axis
    candlestickSeries.applyOptions({
      priceFormat: {
        type: 'price',
        precision: 2,
        minMove: 0.01,
      },
    });

    // Format time axis based on timeframe
    chart.timeScale().applyOptions({
      timeVisible: true,
      secondsVisible: timeframe === '1h',
      // Ensure chart fits the data and fills available space
      rightOffset: 0,
      // Adjust bar spacing for longer timeframes to ensure data fills the chart
      barSpacing: timeframe === '1M' || timeframe === '1Y' ? 6 : undefined,
    });

    // Fit content to ensure all data is visible and chart fills space
    // Use requestAnimationFrame to ensure chart is fully rendered before fitting
    requestAnimationFrame(() => {
      if (chartRef.current) {
        chartRef.current.timeScale().fitContent();
      }
    });

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
        // Re-fit content after resize
        chartRef.current.timeScale().fitContent();
      }
    };

    window.addEventListener('resize', handleResize);

    chartRef.current = chart;
    seriesRef.current = candlestickSeries;

    // Cleanup function
    return () => {
      window.removeEventListener('resize', handleResize);
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
        seriesRef.current = null;
      }
    };
  }, [data, timeframe, height, currentTheme, getThemeColors]);

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
    <div className="w-full h-full" style={{ height, minHeight: height }}>
      <div ref={chartContainerRef} className="w-full h-full" style={{ width: '100%', height: '100%' }} />
    </div>
  );
}
