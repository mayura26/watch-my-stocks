'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  BarChart3, 
  Clock, 
  X,
  AlertCircle,
  Plus,
  RefreshCw
} from 'lucide-react';
import { CandlestickChart } from './candlestick-chart';
import { ChartSkeleton } from './chart-skeleton';

interface AssetDetailDialogProps {
  isOpen: boolean;
  onClose: () => void;
  asset: {
    symbol: string;
    name: string;
    currentPrice: number;
    change: number;
    changePercent: number;
    type: 'stock' | 'crypto' | 'future';
    lastUpdated: string;
  } | null;
}

interface HistoricalData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export function AssetDetailDialog({ isOpen, onClose, asset }: AssetDetailDialogProps) {
  const [historicalData, setHistoricalData] = useState<HistoricalData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [timeframe, setTimeframe] = useState<'15m' | '1d'>('1d');

  useEffect(() => {
    if (isOpen && asset) {
      // Reset to overview tab when dialog opens
      setActiveTab('overview');
      loadHistoricalData();
    }
  }, [isOpen, asset]);

  // Load historical data when timeframe changes (but don't change tab)
  useEffect(() => {
    if (isOpen && asset && activeTab === 'charts') {
      loadHistoricalData();
    }
  }, [timeframe]);

  const loadHistoricalData = async () => {
    if (!asset) return;
    
    setIsLoading(true);
    setDataError(null);
    
    try {
      // Add timestamp to force fresh data fetch
      const timestamp = Date.now();
      const response = await fetch(`/api/assets/historical?symbol=${asset.symbol}&timeframe=${timeframe}&_t=${timestamp}`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to fetch historical data`);
      }
      
      const data = await response.json();
      
      if (!data.data || data.data.length === 0) {
        throw new Error('No historical data available - may be due to API rate limits or data source issues');
      }
      
      setHistoricalData(data.data);
      setDataError(null);
    } catch (error) {
      console.error('Error loading historical data:', error);
      setHistoricalData([]);
      setDataError(error instanceof Error ? error.message : 'Failed to load chart data');
    } finally {
      setIsLoading(false);
    }
  };

  if (!asset) return null;

  const formatPrice = (price: number) => `$${price.toFixed(2)}`;
  const formatPercent = (percent: number) => `${percent >= 0 ? '+' : ''}${percent.toFixed(2)}%`;
  const formatVolume = (volume: number) => {
    if (volume >= 1e9) return `${(volume / 1e9).toFixed(1)}B`;
    if (volume >= 1e6) return `${(volume / 1e6).toFixed(1)}M`;
    if (volume >= 1e3) return `${(volume / 1e3).toFixed(1)}K`;
    return volume.toString();
  };

  const getAssetTypeColor = (type: string) => {
    switch (type) {
      case 'crypto': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'future': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      default: return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    }
  };

  const getAssetTypeIcon = (type: string) => {
    switch (type) {
      case 'crypto': return '₿';
      case 'future': return '📊';
      default: return '📈';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-2xl">{getAssetTypeIcon(asset.type)}</div>
            <div>
              <DialogTitle className="text-2xl font-bold">{asset.symbol}</DialogTitle>
              <p className="text-sm text-muted-foreground">{asset.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={getAssetTypeColor(asset.type)}>
              {asset.type.toUpperCase()}
            </Badge>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="charts">Charts</TabsTrigger>
            <TabsTrigger value="alerts">Alerts</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Price Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5" />
                    Current Price
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{formatPrice(asset.currentPrice)}</div>
                  <div className={`flex items-center gap-2 mt-2 ${
                    asset.change >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {asset.change >= 0 ? (
                      <TrendingUp className="w-4 h-4" />
                    ) : (
                      <TrendingDown className="w-4 h-4" />
                    )}
                    <span className="font-semibold">
                      {formatPrice(Math.abs(asset.change))} ({formatPercent(asset.changePercent)})
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground mt-2">
                    Last updated: {new Date(asset.lastUpdated).toLocaleString()}
                  </div>
                </CardContent>
              </Card>

              {/* Market Stats */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    Market Stats
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Type</span>
                      <Badge className={getAssetTypeColor(asset.type)}>
                        {asset.type.toUpperCase()}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Symbol</span>
                      <span className="font-mono">{asset.symbol}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Change</span>
                      <span className={asset.change >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {formatPercent(asset.changePercent)}
                      </span>
                    </div>
                    {historicalData.length > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Volume</span>
                        <span>{formatVolume(historicalData[historicalData.length - 1]?.volume || 0)}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Performance */}
            {historicalData.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    Recent Performance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold">{formatPrice(asset.currentPrice)}</div>
                      <div className="text-sm text-muted-foreground">Current</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">
                        {formatPrice(historicalData[0]?.open || 0)}
                      </div>
                      <div className="text-sm text-muted-foreground">Open</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">
                        {formatPrice(Math.max(...historicalData.map(d => d.high)))}
                      </div>
                      <div className="text-sm text-muted-foreground">High</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">
                        {formatPrice(Math.min(...historicalData.map(d => d.low)))}
                      </div>
                      <div className="text-sm text-muted-foreground">Low</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="charts" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Price Charts</h3>
                <p className="text-sm text-muted-foreground">
                  {timeframe === '15m' ? 'Last 8 hours (15-minute intervals)' : 'Last 30 days (daily intervals)'}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant={timeframe === '15m' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTimeframe('15m')}
                  disabled={isLoading}
                >
                  {isLoading && timeframe === '15m' ? (
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                  ) : null}
                  15M
                </Button>
                <Button
                  variant={timeframe === '1d' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTimeframe('1d')}
                  disabled={isLoading}
                >
                  {isLoading && timeframe === '1d' ? (
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                  ) : null}
                  1D
                </Button>
              </div>
            </div>

            <Card>
              <CardContent className="p-6">
                {isLoading ? (
                  <ChartSkeleton height={300} />
                ) : dataError ? (
                  <div className="flex items-center justify-center h-64 text-muted-foreground">
                    <div className="text-center max-w-md">
                      <AlertCircle className="w-12 h-12 mx-auto mb-3 text-destructive opacity-50" />
                      <h4 className="font-semibold text-destructive mb-2">Chart Data Unavailable</h4>
                      <p className="text-sm mb-4">{dataError}</p>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={loadHistoricalData}
                        disabled={isLoading}
                      >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Retry
                      </Button>
                    </div>
                  </div>
                ) : historicalData.length > 0 ? (
                  <CandlestickChart 
                    data={historicalData} 
                    timeframe={timeframe}
                    height={300}
                  />
                ) : (
                  <div className="flex items-center justify-center h-64 text-muted-foreground">
                    <div className="text-center">
                      <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>No chart data available</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="alerts" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Price Alerts</h3>
              <Button className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Create Alert
              </Button>
            </div>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-center h-32 text-muted-foreground">
                  <div className="text-center">
                    <AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>Alert system will be implemented in the next iteration</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
