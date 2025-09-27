'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, X, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';

interface SearchResult {
  symbol: string;
  name: string;
  type: 'stock' | 'crypto' | 'future';
  currency?: string;
  exchange?: string;
}

interface AssetSearchProps {
  onAddAsset: (symbol: string, name: string, type: string) => void;
  isAdding?: boolean;
}

export function AssetSearch({ onAddAsset, isAdding = false }: AssetSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [selectedAssetType, setSelectedAssetType] = useState<'all' | 'stock' | 'crypto' | 'future'>('all');
  
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    // Debounce search
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(async () => {
      await searchAssets(query);
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [query, selectedAssetType]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchAssets = async (searchQuery: string) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        q: searchQuery
      });
      
      if (selectedAssetType !== 'all') {
        params.append('type', selectedAssetType);
      }
      
      const response = await fetch(`/api/assets/search?${params.toString()}`);
      const data = await response.json();
      
      if (response.ok) {
        setResults(data.results || []);
        setIsOpen(true);
        setSelectedIndex(-1);
      } else {
        setResults([]);
        setIsOpen(false);
      }
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
      setIsOpen(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || results.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < results.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : results.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < results.length) {
          handleSelectResult(results[selectedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSelectedIndex(-1);
        break;
    }
  };

  const handleSelectResult = (result: SearchResult) => {
    onAddAsset(result.symbol, result.name, result.type);
    setQuery('');
    setResults([]);
    setIsOpen(false);
    setSelectedIndex(-1);
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'crypto':
        return 'text-yellow-600 bg-yellow-100';
      case 'future':
        return 'text-purple-600 bg-purple-100';
      default:
        return 'text-blue-600 bg-blue-100';
    }
  };

  return (
    <div className="relative w-full">
      {/* Asset Type Filter Toggles */}
      <div className="flex gap-2 mb-3">
        {(['all', 'stock', 'crypto', 'future'] as const).map((type) => (
          <Button
            key={type}
            variant={selectedAssetType === type ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedAssetType(type)}
            className="capitalize"
          >
            {type === 'all' ? 'All' : type + 's'}
          </Button>
        ))}
      </div>
      
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <Input
          ref={inputRef}
          type="text"
          placeholder="Search stocks, crypto, futures..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => query.length >= 2 && setIsOpen(true)}
          className="pl-10 pr-10"
        />
        {query && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
            onClick={() => {
              setQuery('');
              setResults([]);
              setIsOpen(false);
              inputRef.current?.focus();
            }}
          >
            <X className="w-3 h-3" />
          </Button>
        )}
      </div>

      {isOpen && (
        <Card 
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 mt-1 z-50 max-h-80 overflow-y-auto"
        >
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-4 text-center text-muted-foreground">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mx-auto mb-2"></div>
                Searching...
              </div>
            ) : results.length > 0 ? (
              <div className="py-1">
                {results.map((result, index) => (
                  <button
                    key={`${result.symbol}-${result.name}-${index}`}
                    className={`w-full px-4 py-3 text-left hover:bg-muted transition-colors ${
                      index === selectedIndex ? 'bg-muted' : ''
                    }`}
                    onClick={() => handleSelectResult(result)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-sm">{result.symbol}</span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(result.type)}`}>
                            {result.type}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {result.name}
                        </p>
                        {result.exchange && (
                          <p className="text-xs text-muted-foreground">
                            {result.exchange}
                          </p>
                        )}
                      </div>
                      <Plus className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    </div>
                  </button>
                ))}
              </div>
            ) : query.length >= 2 ? (
              <div className="p-4 text-center text-muted-foreground">
                <div className="mb-2">No assets found for "{query}"</div>
                <div className="text-xs">
                  Make sure API keys are configured in environment variables
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
