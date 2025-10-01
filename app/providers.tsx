'use client';

import { SessionProvider } from 'next-auth/react';
import { ThemeProvider } from '@/lib/theme-provider';
import { Toaster } from 'sonner';
import { useServiceWorker } from '@/lib/use-service-worker';

export function Providers({ children }: { children: React.ReactNode }) {
  // Register service worker
  useServiceWorker();

  return (
    <SessionProvider>
      <ThemeProvider defaultTheme="auto" storageKey="watch-my-stocks-theme">
        {children}
        <Toaster />
      </ThemeProvider>
    </SessionProvider>
  );
}

