'use client';

import { useSession } from 'next-auth/react';
import { Navigation } from '@/components/navigation';
import { AssetCard } from '@/components/asset-card';
import { AssetSearch } from '@/components/asset-search';
import { AssetDetailDialog } from '@/components/asset-detail-dialog';
import { PortfolioAsset } from '@/types/asset';
import { QuoteData } from '@/lib/data-providers/types';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, RefreshCw } from 'lucide-react';

// Type-safe session helper
function getTypedSession(session: any) {
  return session as { user: { id: string; email: string; name: string; firstName: string; lastName: string; theme: string; notificationsEnabled: boolean } } | null;
}

export default function Home() {
  const { data: session, status } = useSession();
  const [selectedAsset, setSelectedAsset] = useState<PortfolioAsset | null>(null);
  const [portfolio, setPortfolio] = useState<PortfolioAsset[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showAssetDialog, setShowAssetDialog] = useState(false);

  // Load portfolio on mount
  useEffect(() => {
    const typedSession = getTypedSession(session);
    if (typedSession?.user?.id) {
      loadPortfolio();
    }
  }, [session]);

  const loadPortfolio = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/portfolio');
      const data = await response.json();
      
      if (response.ok) {
        const portfolioData = data.portfolio || [];
        
        // Fetch real-time quotes for all portfolio assets
        const symbols = portfolioData.map((asset: PortfolioAsset) => asset.symbol);
        if (symbols.length > 0) {
          const quotesResponse = await fetch(`/api/assets/quotes?symbols=${symbols.join(',')}`);
          if (quotesResponse.ok) {
            const quotesData = await quotesResponse.json();
            const quotesMap = new Map<string, QuoteData>(quotesData.quotes.map((q: QuoteData) => [q.symbol, q]));
            
            // Update portfolio with real-time data
            const updatedPortfolio = portfolioData.map((asset: PortfolioAsset) => {
              const quote = quotesMap.get(asset.symbol);
              return {
                ...asset,
                currentPrice: quote?.currentPrice ?? asset.currentPrice,
                change: quote?.change ?? 0,
                changePercent: quote?.changePercent ?? 0,
                lastUpdated: quote?.lastUpdated ?? asset.lastUpdated
              };
            });
            
            setPortfolio(updatedPortfolio);
          } else {
            setPortfolio(portfolioData);
          }
        } else {
          setPortfolio(portfolioData);
        }
      } else {
        console.error('Failed to load portfolio:', data.error);
      }
    } catch (error) {
      console.error('Portfolio load error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddAsset = async (symbol: string, name: string, type: string) => {
    try {
      const response = await fetch('/api/portfolio', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ symbol, name, type }),
      });

      const data = await response.json();
      
      if (response.ok) {
        await loadPortfolio(); // Reload portfolio
        setShowSearch(false);
      } else {
        console.error('Failed to add asset:', data.error);
        // You could add a toast notification here
      }
    } catch (error) {
      console.error('Add asset error:', error);
    }
  };

  const handleRemoveAsset = async (symbol: string) => {
    try {
      const response = await fetch(`/api/portfolio?symbol=${encodeURIComponent(symbol)}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      
      if (response.ok) {
        await loadPortfolio(); // Reload portfolio
      } else {
        console.error('Failed to remove asset:', data.error);
      }
    } catch (error) {
      console.error('Remove asset error:', error);
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-muted rounded w-48 mb-6"></div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-32 bg-muted rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8 text-center">
          <h1 className="text-4xl font-bold mb-4">Welcome to WatchMyStocks</h1>
          <p className="text-xl text-muted-foreground mb-8">
            Track your favorite stocks, crypto, and futures with real-time alerts
          </p>
          <div className="flex gap-4 justify-center">
            <Button asChild>
              <a href="/auth/signup">Get Started</a>
            </Button>
            <Button variant="outline" asChild>
              <a href="/auth/signin">Sign In</a>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
          <div className="container mx-auto px-4 py-8">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-bold">Your Portfolio</h1>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline"
                  size="sm"
                  onClick={loadPortfolio}
                  disabled={isLoading}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
                <Button 
                  className="flex items-center gap-2"
                  onClick={() => setShowSearch(!showSearch)}
                >
                  <Plus className="w-4 h-4" />
                  Add Asset
                </Button>
              </div>
            </div>

            {showSearch && (
              <div className="mb-6">
                <AssetSearch onAddAsset={handleAddAsset} />
              </div>
            )}

            {isLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {Array.from({ length: portfolio.length || 6 }).map((_, i) => (
                  <div key={i} className="h-32 bg-muted rounded animate-pulse"></div>
                ))}
              </div>
            ) : portfolio.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {portfolio.map((asset) => (
                  <div key={asset.id} className="relative group">
                        <AssetCard
                          asset={{
                            id: asset.id,
                            symbol: asset.symbol,
                            name: asset.name,
                            currentPrice: asset.currentPrice,
                            change: asset.change,
                            changePercent: asset.changePercent,
                            type: asset.type,
                            lastUpdated: asset.lastUpdated
                          }}
                          onClick={() => {
                            setSelectedAsset(asset);
                            setShowAssetDialog(true);
                          }}
                        />
                    <Button
                      variant="destructive"
                      size="sm"
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveAsset(asset.symbol);
                      }}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-muted-foreground mb-4">
                  <Plus className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-semibold mb-2">No assets in your portfolio</h3>
                  <p className="text-sm">Start by adding some stocks, crypto, or futures to track</p>
                </div>
                <Button onClick={() => setShowSearch(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Your First Asset
                </Button>
              </div>
            )}

            <AssetDetailDialog
              isOpen={showAssetDialog}
              onClose={() => {
                setShowAssetDialog(false);
                setSelectedAsset(null);
              }}
              asset={selectedAsset ? {
                symbol: selectedAsset.symbol,
                name: selectedAsset.name,
                currentPrice: selectedAsset.currentPrice,
                change: selectedAsset.change,
                changePercent: selectedAsset.changePercent,
                type: selectedAsset.type,
                lastUpdated: selectedAsset.lastUpdated || 'Unknown'
              } : null}
            />
          </div>
        </div>
      );
    }
