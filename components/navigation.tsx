'use client';

import { useSession, signOut } from 'next-auth/react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function Navigation() {
  const { data: session, status } = useSession();
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  if (status === 'loading') {
    return (
      <nav className="border-b bg-background">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold">WatchMyStocks</h1>
            <div className="w-8 h-8 bg-muted animate-pulse rounded"></div>
          </div>
        </div>
      </nav>
    );
  }

  if (!session) {
    return (
      <nav className="border-b bg-background">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold">WatchMyStocks</h1>
            <div className="flex gap-2">
              <Button variant="outline" asChild>
                <a href="/auth/signin">Sign In</a>
              </Button>
              <Button asChild>
                <a href="/auth/signup">Sign Up</a>
              </Button>
            </div>
          </div>
        </div>
      </nav>
    );
  }

  return (
    <nav className="border-b bg-background">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">WatchMyStocks</h1>
          
          <div className="flex items-center gap-4">
            <Button variant="outline" asChild>
              <a href="/alerts">Alerts</a>
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
                    {session.user.firstName?.[0]}{session.user.lastName?.[0]}
                  </div>
                  <span className="hidden sm:inline">
                    {session.user.firstName} {session.user.lastName}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setIsProfileOpen(true)}>
                  Profile & Settings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => signOut()}>
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </nav>
  );
}

