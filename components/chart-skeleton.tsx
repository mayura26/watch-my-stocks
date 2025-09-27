'use client';

interface ChartSkeletonProps {
  height?: number;
}

export function ChartSkeleton({ height = 300 }: ChartSkeletonProps) {
  return (
    <div className="w-full" style={{ height }}>
      <div className="animate-pulse">
        {/* Chart area skeleton */}
        <div className="h-full bg-muted rounded-lg relative">
          {/* Y-axis skeleton */}
          <div className="absolute left-0 top-0 bottom-0 w-12 flex flex-col justify-between py-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-3 bg-muted-foreground/20 rounded w-8 ml-2"></div>
            ))}
          </div>
          
          {/* X-axis skeleton */}
          <div className="absolute bottom-0 left-12 right-0 h-8 flex justify-between items-center px-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-3 bg-muted-foreground/20 rounded w-12"></div>
            ))}
          </div>
          
          {/* Candlestick bars skeleton */}
          <div className="absolute left-12 top-4 right-4 bottom-8 flex items-end justify-between">
            {Array.from({ length: 20 }).map((_, i) => (
              <div 
                key={i} 
                className="bg-muted-foreground/20 rounded-sm"
                style={{
                  width: '3px',
                  height: `${Math.random() * 60 + 20}%`,
                  marginRight: '1px'
                }}
              ></div>
            ))}
          </div>
          
          {/* Loading indicator */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-sm text-muted-foreground">Loading chart data...</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
