'use client';

import { useState, useEffect, useCallback } from 'react';
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
  X,
  AlertCircle,
  RefreshCw,
  Bell
} from 'lucide-react';
import { CandlestickChart } from './candlestick-chart';
import { ChartSkeleton } from './chart-skeleton';
import { AlertCreationModal } from './alert-creation-modal';
import { useDetailedRelativeTime } from '@/lib/hooks/use-relative-time';

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

interface Alert {
  id: string;
  symbol: string;
  asset_name: string;
  asset_type: string;
  alert_type: string;
  threshold_value: number;
  is_active: boolean;
  is_enabled: boolean;
  last_triggered: string | null;
  trigger_count: number;
  created_at: string;
  updated_at: string;
}

export function AssetDetailDialog({ isOpen, onClose, asset }: AssetDetailDialogProps) {
  const [historicalData, setHistoricalData] = useState<HistoricalData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [timeframe, setTimeframe] = useState<'1h' | '1d' | '1M' | '1Y'>('1d');
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [alertsLoading, setAlertsLoading] = useState(false);
  const relativeTime = useDetailedRelativeTime(asset?.lastUpdated);

  const loadHistoricalData = useCallback(async () => {
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
  }, [asset, timeframe]);

  const loadAlerts = useCallback(async () => {
    if (!asset) return;
    
    setAlertsLoading(true);
    try {
      const response = await fetch('/api/alerts');
      if (response.ok) {
        const data = await response.json();
        // Filter alerts for this specific asset
        const assetAlerts = data.alerts?.filter((alert: Alert) => alert.symbol === asset.symbol) || [];
        setAlerts(assetAlerts);
      }
    } catch (error) {
      console.error('Error loading alerts:', error);
    } finally {
      setAlertsLoading(false);
    }
  }, [asset]);

  useEffect(() => {
    if (isOpen && asset) {
      // Reset to overview tab when dialog opens (but not when timeframe changes)
      setActiveTab('overview');
    }
  }, [isOpen, asset]);

  useEffect(() => {
    if (isOpen && asset && activeTab === 'alerts') {
      loadAlerts();
    }
  }, [isOpen, asset, activeTab, loadAlerts]);

  // Load historical data when dialog opens or timeframe changes
  useEffect(() => {
    if (isOpen && asset) {
      loadHistoricalData();
    }
  }, [isOpen, asset, timeframe, loadHistoricalData]);

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
    <Dialog open={isOpen}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" showCloseButton={false}>
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
                    Last updated: {relativeTime}
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
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Volume</span>
                      {isLoading ? (
                        <div className="h-3 w-8 bg-muted animate-pulse rounded"></div>
                      ) : historicalData.length > 0 ? (
                        <span>{formatVolume(historicalData[historicalData.length - 1]?.volume || 0)}</span>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Performance - Compact */}
            <Card className="py-1.5 px-2">
              <CardContent className="py-1.5 px-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Session Range:</span>
                  {isLoading ? (
                    <div className="flex gap-6 text-xs">
                      <div className="h-3 w-12 bg-muted animate-pulse rounded"></div>
                      <div className="h-3 w-12 bg-muted animate-pulse rounded"></div>
                      <div className="h-3 w-12 bg-muted animate-pulse rounded"></div>
                    </div>
                  ) : historicalData.length > 0 ? (
                    <div className="flex gap-6 text-xs">
                      <span>Open: {formatPrice(historicalData[0]?.open || 0)}</span>
                      <span>High: {formatPrice(Math.max(...historicalData.map(d => d.high)))}</span>
                      <span>Low: {formatPrice(Math.min(...historicalData.map(d => d.low)))}</span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-xs">No data available</span>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="charts" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Price Charts</h3>
                <p className="text-sm text-muted-foreground">
                  {timeframe === '1h' && 'Last 1 hour (1-minute intervals)'}
                  {timeframe === '1d' && 'Last 1 day (15-minute intervals)'}
                  {timeframe === '1M' && 'Last 1 month (daily intervals)'}
                  {timeframe === '1Y' && 'Last 1 year (daily intervals)'}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant={timeframe === '1h' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTimeframe('1h')}
                  disabled={isLoading}
                >
                  {isLoading && timeframe === '1h' ? (
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                  ) : null}
                  1H
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
                <Button
                  variant={timeframe === '1M' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTimeframe('1M')}
                  disabled={isLoading}
                >
                  {isLoading && timeframe === '1M' ? (
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                  ) : null}
                  1M
                </Button>
                <Button
                  variant={timeframe === '1Y' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTimeframe('1Y')}
                  disabled={isLoading}
                >
                  {isLoading && timeframe === '1Y' ? (
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                  ) : null}
                  1Y
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
              <Button 
                onClick={() => setShowAlertModal(true)}
                className="flex items-center gap-2"
              >
                <Bell className="w-4 h-4" />
                Create Alert
              </Button>
            </div>

            {alertsLoading ? (
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                    <span className="ml-2 text-muted-foreground">Loading alerts...</span>
                  </div>
                </CardContent>
              </Card>
            ) : alerts.length === 0 ? (
              <Card>
                <CardContent className="p-6">
                  <div className="text-center">
                    <Bell className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <h4 className="font-semibold mb-2">No alerts for {asset?.symbol}</h4>
                    <p className="text-muted-foreground mb-4">
                      Get notified when {asset?.symbol} reaches your target price or moves by a certain percentage.
                    </p>
                    <Button 
                      onClick={() => setShowAlertModal(true)}
                      className="flex items-center gap-2"
                    >
                      <Bell className="w-4 h-4" />
                      Create Your First Alert
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {alerts.map((alert) => (
                  <Card key={alert.id} className={!alert.is_enabled ? 'opacity-60' : ''}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge 
                              variant="outline"
                              className={
                                alert.alert_type === 'price_above' 
                                  ? 'bg-green-100 text-green-800 border-green-300 dark:bg-green-950 dark:text-green-300 dark:border-green-800' 
                                  : alert.alert_type === 'price_below'
                                  ? 'bg-red-100 text-red-800 border-red-300 dark:bg-red-950 dark:text-red-300 dark:border-red-800'
                                  : 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800'
                              }
                            >
                              {alert.alert_type === 'price_above' ? 'Above' : 
                               alert.alert_type === 'price_below' ? 'Below' : 
                               'Percentage'}
                            </Badge>
                            <span className="font-mono text-lg font-semibold">
                              {alert.alert_type === 'percentage_move' 
                                ? `${alert.threshold_value}%` 
                                : `$${alert.threshold_value.toFixed(2)}`}
                            </span>
                            {!alert.is_enabled && (
                              <Badge variant="outline" className="text-xs">
                                Disabled
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {alert.alert_type === 'price_above' 
                              ? `Alert when ${asset?.symbol} goes above $${alert.threshold_value.toFixed(2)}`
                              : alert.alert_type === 'price_below'
                              ? `Alert when ${asset?.symbol} goes below $${alert.threshold_value.toFixed(2)}`
                              : `Alert when ${asset?.symbol} moves ${alert.threshold_value}% in a day`
                            }
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            Created {new Date(alert.created_at).toLocaleDateString()}
                            {alert.trigger_count > 0 && (
                              <span className="ml-2 text-orange-600">
                                • Triggered {alert.trigger_count} time{alert.trigger_count > 1 ? 's' : ''}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              // TODO: Implement edit functionality
                              console.log('Edit alert:', alert.id);
                            }}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                              try {
                                const response = await fetch(`/api/alerts/${alert.id}`, {
                                  method: 'DELETE',
                                });
                                if (response.ok) {
                                  loadAlerts(); // Reload alerts
                                }
                              } catch (error) {
                                console.error('Error deleting alert:', error);
                              }
                            }}
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>

      {/* Alert Creation Modal */}
      <AlertCreationModal
        isOpen={showAlertModal}
        onClose={() => setShowAlertModal(false)}
        symbol={asset?.symbol || ''}
        currentPrice={asset?.currentPrice || 0}
        onAlertCreated={() => {
          loadAlerts(); // Refresh alerts list
          setShowAlertModal(false);
        }}
      />
    </Dialog>
  );
}
