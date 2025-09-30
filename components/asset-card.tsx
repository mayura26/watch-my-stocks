import { Asset } from '@/types/asset';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface AssetCardProps {
  asset: Asset;
  onClick: () => void;
}

export function AssetCard({ asset, onClick }: AssetCardProps) {
  const isPositive = asset.change >= 0;
  const ChangeIcon = isPositive ? TrendingUp : TrendingDown;

  const getAssetTypeColor = (type: string) => {
    switch (type) {
      case 'crypto': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'future': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      default: return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    }
  };

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow h-full py-1.5 px-2"
      onClick={onClick}
    >
      <CardContent className="p-1.5 h-full flex flex-col">
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
            <div className={`flex items-center gap-1 text-xs ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
              <ChangeIcon className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">
                {isPositive ? '+' : ''}{asset.changePercent.toFixed(2)}%
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

