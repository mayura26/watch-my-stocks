'use client';

import { useEffect } from 'react';

// Check if app version matches service worker version
async function checkVersion() {
  try {
    const response = await fetch('/api/version');
    if (response.ok) {
      const data = await response.json();
      const currentVersion = data.version || '1';
      
      // Check if version is stored in service worker
      const registration = await navigator.serviceWorker.ready;
      if (registration) {
        // Get cache names to determine service worker version
        const cacheNames = await caches.keys();
        const versionCache = cacheNames.find(name => name.startsWith('watchmystocks-v'));
        
        if (versionCache) {
          const swVersion = versionCache.replace('watchmystocks-v', '');
          if (swVersion !== currentVersion) {
            console.log(`Version mismatch: SW has v${swVersion}, app has v${currentVersion}`);
            return { mismatch: true, swVersion, currentVersion };
          }
        }
      }
    }
  } catch (error) {
    console.error('Error checking version:', error);
  }
  return { mismatch: false };
}

export function useServiceWorker() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check if service workers are supported
    if ('serviceWorker' in navigator) {
      const registerSW = async () => {
        try {
          const registration = await navigator.serviceWorker.register('/sw.js', {
            scope: '/',
          });

          console.log('Service Worker registered successfully:', registration);

          // Check version after registration
          const versionCheck = await checkVersion();
          if (versionCheck.mismatch) {
            console.log('Version mismatch detected, waiting for service worker update...');
          }

          // Handle updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // New content is available, notify user
                  console.log('New version available, please refresh.');
                  
                  // Check version again to confirm mismatch
                  checkVersion().then((versionCheck) => {
                    if (versionCheck.mismatch) {
                      if (confirm(`New version available (v${versionCheck.currentVersion})! Refresh to update?`)) {
                        window.location.reload();
                      }
                    }
                  });
                }
              });
            }
          });

        } catch (error) {
          console.error('Service Worker registration failed:', error);
        }
      };

      // Register service worker
      registerSW();

      // Handle service worker messages
      navigator.serviceWorker.addEventListener('message', (event) => {
        console.log('Message from service worker:', event.data);
      });

      // Handle controller change (app was updated)
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('Service worker controller changed');
        // Check version before reloading
        checkVersion().then((versionCheck) => {
          if (versionCheck.mismatch) {
            window.location.reload();
          }
        });
      });
    }
  }, []);
}
