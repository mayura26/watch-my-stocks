'use client';

import { useSession, signOut } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ThemeToggle } from '@/components/theme-toggle';
import { Home, Bell, BarChart3, Settings, User, MessageSquare } from 'lucide-react';

export function Navigation() {
  const { data: session, status } = useSession();
  const pathname = usePathname();

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

  const navigationItems = [
    { name: 'Portfolio', href: '/', icon: Home },
    { name: 'Alerts', href: '/alerts', icon: Bell },
    { name: 'Notifications', href: '/notifications', icon: MessageSquare },
    // { name: 'Analytics', href: '/analytics', icon: BarChart3 },
    // { name: 'Settings', href: '/settings', icon: Settings },
  ];

  return (
    <nav className="border-b bg-background sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-primary" />
            <h1 className="text-xl font-bold">WatchMyStocks</h1>
          </Link>
          
          {/* Navigation Links */}
          <div className="hidden md:flex items-center gap-1">
            {navigationItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Button
                  key={item.name}
                  variant={isActive ? "default" : "ghost"}
                  asChild
                  className="flex items-center gap-2"
                >
                  <Link href={item.href}>
                    <Icon className="w-4 h-4" />
                    {item.name}
                  </Link>
                </Button>
              );
            })}
          </div>
          
          {/* Right side actions */}
          <div className="flex items-center gap-2">
            {/* Mobile menu button - we'll add this later */}
            <div className="md:hidden">
              <Button variant="outline" asChild>
                <Link href="/alerts">
                  <Bell className="w-4 h-4" />
                </Link>
              </Button>
            </div>
            
            <ThemeToggle />
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
                    {(session.user as any)?.firstName?.[0]}{(session.user as any)?.lastName?.[0]}
                  </div>
                  <span className="hidden sm:inline">
                    {(session.user as any)?.firstName} {(session.user as any)?.lastName}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href="/settings" className="flex items-center gap-2">
                    <Settings className="w-4 h-4" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/profile" className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Profile
                  </Link>
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

