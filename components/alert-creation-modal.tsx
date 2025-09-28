'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, DollarSign, TrendingUp, TrendingDown } from 'lucide-react';
import { useSession } from 'next-auth/react';

interface AlertCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  symbol: string;
  currentPrice: number;
  onAlertCreated: () => void;
}

interface PortfolioAsset {
  symbol: string;
  name: string;
  asset_type: string;
}

export function AlertCreationModal({ 
  isOpen, 
  onClose, 
  symbol, 
  currentPrice, 
  onAlertCreated 
}: AlertCreationModalProps) {
  const { data: session } = useSession();
  const [portfolioAssets, setPortfolioAssets] = useState<PortfolioAsset[]>([]);
  const [selectedSymbol, setSelectedSymbol] = useState(symbol);
  const [alertType, setAlertType] = useState<'price_above' | 'price_below' | 'percentage_move'>('price_above');
  const [thresholdValue, setThresholdValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [alertCount, setAlertCount] = useState(0);

  // Load portfolio assets and alert count
  useEffect(() => {
    if (isOpen && session?.user) {
      loadPortfolioAssets();
      loadAlertCount();
    }
  }, [isOpen, session?.user]);

  const loadPortfolioAssets = async () => {
    try {
      const response = await fetch('/api/portfolio');
      if (response.ok) {
        const data = await response.json();
        // Convert portfolio format to the expected format
        const assets = (data.portfolio || []).map((item: any) => ({
          symbol: item.symbol,
          name: item.name,
          asset_type: item.type
        }));
        setPortfolioAssets(assets);
      } else {
        console.error('Failed to load portfolio:', response.status);
      }
    } catch (error) {
      console.error('Error loading portfolio assets:', error);
    }
  };

  const loadAlertCount = async () => {
    try {
      const response = await fetch('/api/alerts/count');
      if (response.ok) {
        const data = await response.json();
        setAlertCount(data.count || 0);
      }
    } catch (error) {
      console.error('Error loading alert count:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const threshold = parseFloat(thresholdValue);
      
      // Validation
      if (isNaN(threshold) || threshold <= 0) {
        setError('Please enter a valid threshold value');
        return;
      }

      if (alertType === 'percentage_move' && (threshold < 1 || threshold > 100)) {
        setError('Percentage must be between 1% and 100%');
        return;
      }

      if (alertCount >= 500) {
        setError('You have reached the maximum limit of 500 alerts');
        return;
      }

      const response = await fetch('/api/alerts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          symbol: selectedSymbol,
          alert_type: alertType,
          threshold_value: threshold,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create alert');
      }

      onAlertCreated();
      onClose();
      setThresholdValue('');
      setSelectedSymbol(symbol);
      setAlertType('price_above');
    } catch (error) {
      console.error('Error creating alert:', error);
      setError(error instanceof Error ? error.message : 'Failed to create alert');
    } finally {
      setIsLoading(false);
    }
  };

  const getThresholdLabel = () => {
    switch (alertType) {
      case 'price_above':
        return 'Price above ($)';
      case 'price_below':
        return 'Price below ($)';
      case 'percentage_move':
        return 'Percentage move (%)';
      default:
        return 'Threshold value';
    }
  };

  const getThresholdPlaceholder = () => {
    switch (alertType) {
      case 'price_above':
        return `e.g., ${(currentPrice * 1.1).toFixed(2)}`;
      case 'price_below':
        return `e.g., ${(currentPrice * 0.9).toFixed(2)}`;
      case 'percentage_move':
        return 'e.g., 5';
      default:
        return 'Enter threshold value';
    }
  };

  const getAlertDescription = () => {
    const asset = portfolioAssets.find(a => a.symbol === selectedSymbol);
    const assetName = asset?.name || selectedSymbol;
    
    switch (alertType) {
      case 'price_above':
        return `Get notified when ${assetName} goes above $${thresholdValue || 'X'}`;
      case 'price_below':
        return `Get notified when ${assetName} goes below $${thresholdValue || 'X'}`;
      case 'percentage_move':
        return `Get notified when ${assetName} moves ${thresholdValue || 'X'}% in a day`;
      default:
        return '';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            Create Price Alert
          </DialogTitle>
          <DialogDescription>
            Set up notifications for price movements on your portfolio assets.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Asset Selection */}
          <div className="space-y-2">
            <Label htmlFor="symbol">Asset</Label>
            {portfolioAssets.length === 0 ? (
              <div className="p-4 border border-dashed border-muted-foreground/25 rounded-md text-center">
                <AlertCircle className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground mb-2">
                  No assets in your portfolio
                </p>
                <p className="text-xs text-muted-foreground">
                  Add assets to your portfolio first to create alerts
                </p>
              </div>
            ) : (
              <Select value={selectedSymbol} onValueChange={setSelectedSymbol}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an asset" />
                </SelectTrigger>
                <SelectContent>
                  {portfolioAssets.map((asset) => (
                    <SelectItem key={asset.symbol} value={asset.symbol}>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{asset.symbol}</span>
                        <span className="text-muted-foreground text-sm">{asset.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Alert Type */}
          <div className="space-y-2">
            <Label htmlFor="alertType">Alert Type</Label>
            <Select value={alertType} onValueChange={(value: any) => setAlertType(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select alert type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="price_above">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-green-500" />
                    <span>Price Above</span>
                  </div>
                </SelectItem>
                <SelectItem value="price_below">
                  <div className="flex items-center gap-2">
                    <TrendingDown className="w-4 h-4 text-red-500" />
                    <span>Price Below</span>
                  </div>
                </SelectItem>
                <SelectItem value="percentage_move">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-blue-500" />
                    <span>Percentage Move</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Threshold Value */}
          <div className="space-y-2">
            <Label htmlFor="thresholdValue">{getThresholdLabel()}</Label>
            <Input
              id="thresholdValue"
              type="number"
              step="0.01"
              min="0"
              max={alertType === 'percentage_move' ? 100 : undefined}
              value={thresholdValue}
              onChange={(e) => setThresholdValue(e.target.value)}
              placeholder={getThresholdPlaceholder()}
              required
            />
          </div>

          {/* Alert Description */}
          {thresholdValue && (
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                {getAlertDescription()}
              </p>
            </div>
          )}

          {/* Alert Count Warning */}
          {alertCount >= 450 && (
            <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                ⚠️ You have {alertCount}/500 alerts. Consider removing unused alerts.
              </p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !thresholdValue || portfolioAssets.length === 0}
              className="flex-1"
            >
              {isLoading ? 'Creating...' : 'Create Alert'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
