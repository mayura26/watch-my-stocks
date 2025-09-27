'use client';

import { useSession } from 'next-auth/react';
import { Navigation } from '@/components/navigation';
import { AssetCard } from '@/components/asset-card';
import { mockAssets } from '@/lib/mock-data';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

export default function Home() {
  const { data: session, status } = useSession();
  const [selectedAsset, setSelectedAsset] = useState<string | null>(null);

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
          <Button className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Add Stock
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {mockAssets.map((asset) => (
            <AssetCard
              key={asset.id}
              asset={asset}
              onClick={() => setSelectedAsset(asset.symbol)}
            />
          ))}
        </div>

        {selectedAsset && (
          <div className="mt-8 p-4 bg-muted rounded-lg">
            <p>Selected: {selectedAsset}</p>
            <p className="text-sm text-muted-foreground">
              Asset detail dialog will be implemented in the next iteration
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
