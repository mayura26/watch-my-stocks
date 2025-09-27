import { Asset } from '@/types/asset';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface AssetCardProps {
  asset: Asset;
  onClick: () => void;
}

export function AssetCard({ asset, onClick }: AssetCardProps) {
  const isPositive = asset.change >= 0;
  const ChangeIcon = isPositive ? TrendingUp : TrendingDown;

  return (
    <Card 
      className="cursor-pointer hover:shadow-md transition-shadow h-full"
      onClick={onClick}
    >
      <CardContent className="p-3 h-full flex flex-col">
        {/* Header with symbol and price */}
        <div className="flex items-start justify-between mb-2 min-h-[2.5rem]">
          <div className="flex-1 min-w-0 pr-2">
            <h3 className="font-bold text-lg leading-tight">{asset.symbol}</h3>
            <p className="text-xs text-muted-foreground truncate leading-tight">
              {asset.name}
            </p>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="text-sm font-semibold leading-tight">
              ${asset.currentPrice.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Change info */}
        <div className={`flex items-center gap-1 text-xs mb-2 ${
          isPositive ? 'text-green-600' : 'text-red-600'
        }`}>
          <ChangeIcon className="w-3 h-3 flex-shrink-0" />
          <span className="truncate">
            {isPositive ? '+' : ''}{asset.change.toFixed(2)} ({isPositive ? '+' : ''}{asset.changePercent.toFixed(2)}%)
          </span>
        </div>
        
            {/* Footer */}
            <div className="flex items-center justify-between text-xs text-muted-foreground mt-auto">
              <span className="capitalize truncate">{asset.type}</span>
              <span className="text-xs truncate ml-2">Details</span>
            </div>
            
            {/* Last updated indicator */}
            {asset.lastUpdated && (
              <div className="text-xs text-muted-foreground mt-1">
                Updated {new Date(asset.lastUpdated).toLocaleTimeString()}
              </div>
            )}
      </CardContent>
    </Card>
  );
}

