import { Asset } from '@/types/asset';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface AssetCardProps {
  asset: Asset;
  onClick: () => void;
  isRefreshing?: boolean;
}

export function AssetCard({ asset, onClick, isRefreshing = false }: AssetCardProps) {
  // Safely handle undefined values with defaults
  const currentPrice = asset.currentPrice ?? 0;
  const change = asset.change ?? 0;
  const changePercent = asset.changePercent ?? 0;
  
  const isPositive = change >= 0;
  const ChangeIcon = isPositive ? TrendingUp : TrendingDown;
  const prevPriceRef = useRef(currentPrice);
  const prevChangeRef = useRef(changePercent);
  const [isUpdating, setIsUpdating] = useState(false);

  // Detect when price changes and trigger update animation
  useEffect(() => {
    if (prevPriceRef.current !== currentPrice || prevChangeRef.current !== changePercent) {
      setIsUpdating(true);
      const timer = setTimeout(() => setIsUpdating(false), 600);
      prevPriceRef.current = currentPrice;
      prevChangeRef.current = changePercent;
      return () => clearTimeout(timer);
    }
  }, [currentPrice, changePercent]);

  const getAssetTypeColor = (type: string) => {
    switch (type) {
      case 'crypto': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'future': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      default: return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    }
  };

  return (
    <Card
      className={`cursor-pointer hover:shadow-md transition-all h-full py-1.5 px-2 relative overflow-hidden ${
        isRefreshing ? 'opacity-90' : ''
      }`}
      onClick={onClick}
    >
      {/* Subtle shimmer effect during refresh */}
      {isRefreshing && (
        <div className="absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-white/10 dark:via-white/5 to-transparent pointer-events-none" />
      )}
      
      <CardContent className="p-1.5 h-full flex flex-col relative z-10">
        {/* Header with symbol and price */}
        <div className="flex items-start justify-between mb-2 min-h-[2.5rem]">
          <div className="flex-1 min-w-0 pr-2">
            <h3 className="font-bold text-lg leading-tight">{asset.symbol}</h3>
            <p className="text-xs text-muted-foreground truncate leading-tight">
              {asset.name}
            </p>
          </div>
          <div className="text-right flex-shrink-0">
            <div 
              className={`text-sm font-semibold leading-tight transition-all duration-500 ease-out ${
                isUpdating ? 'scale-110 text-primary' : ''
              }`}
              key={`price-${currentPrice}`}
            >
              ${currentPrice.toFixed(2)}
            </div>
            <div 
              className={`flex items-center gap-1 text-xs transition-all duration-500 ease-out ${
                isPositive ? 'text-green-600' : 'text-red-600'
              } ${isUpdating ? 'scale-105' : ''}`}
              key={`change-${changePercent}`}
            >
              <ChangeIcon className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">
                {isPositive ? '+' : ''}{changePercent.toFixed(2)}%
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-muted-foreground mt-auto">
          <Badge className={`${getAssetTypeColor(asset.type)} hidden sm:inline-flex`}>
            {asset.type.toUpperCase()}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}

