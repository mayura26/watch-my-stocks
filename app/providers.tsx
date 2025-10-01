'use client';

import { SessionProvider } from 'next-auth/react';
import { ThemeProvider } from '@/lib/theme-provider';
import { Toaster } from 'sonner';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider defaultTheme="auto" storageKey="watch-my-stocks-theme">
        {children}
        <Toaster />
      </ThemeProvider>
    </SessionProvider>
  );
}

