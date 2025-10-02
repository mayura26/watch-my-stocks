'use client';

export interface NotificationData {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: any;
  requireInteraction?: boolean;
  silent?: boolean;
}

class NotificationService {
  private permission: NotificationPermission = 'default';
  private isSupported: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.isSupported = 'Notification' in window;
      this.permission = this.isSupported ? Notification.permission : 'denied';
    }
  }

  async requestPermission(): Promise<boolean> {
    if (typeof window === 'undefined') {
      return false;
    }

    // Initialize if not already done
    if (!this.isSupported && 'Notification' in window) {
      this.isSupported = true;
      this.permission = Notification.permission;
    }

    if (!this.isSupported) {
      console.warn('Notifications are not supported in this browser');
      return false;
    }

    if (this.permission === 'granted') {
      return true;
    }

    try {
      const permission = await Notification.requestPermission();
      this.permission = permission;
      return permission === 'granted';
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }

  async showNotification(data: NotificationData): Promise<void> {
    if (typeof window === 'undefined') {
      return;
    }

    // Initialize if not already done
    if (!this.isSupported && 'Notification' in window) {
      this.isSupported = true;
      this.permission = Notification.permission;
    }

    if (!this.isSupported || this.permission !== 'granted') {
      console.warn('Cannot show notification: permission not granted or not supported');
      return;
    }

    try {
      const notification = new Notification(data.title, {
        body: data.body,
        icon: data.icon || '/icons/icon-192x192.png',
        badge: data.badge || '/icons/icon-72x72.png',
        tag: data.tag,
        data: data.data,
        requireInteraction: data.requireInteraction || false,
        silent: data.silent || false,
        vibrate: [200, 100, 200],
      } as NotificationOptions);

      // Auto-close after 5 seconds unless requireInteraction is true
      if (!data.requireInteraction) {
        setTimeout(() => {
          notification.close();
        }, 5000);
      }

      // Handle click
      notification.onclick = (event) => {
        event.preventDefault();
        window.focus();
        
        if (data.data?.url) {
          window.location.href = data.data.url;
        }
        
        notification.close();
      };

    } catch (error) {
      console.error('Error showing notification:', error);
    }
  }

  async showAlertNotification(alertData: {
    symbol: string;
    currentPrice: number;
    alertType: string;
    threshold: number;
    alertId: string;
  }): Promise<void> {
    const { symbol, currentPrice, alertType, threshold } = alertData;
    
    let title = '';
    let body = '';

    if (alertType === 'price_above') {
      title = `${symbol} Alert Triggered`;
      body = `${symbol} is now $${currentPrice.toFixed(2)}, above your threshold of $${threshold.toFixed(2)}`;
    } else if (alertType === 'price_below') {
      title = `${symbol} Alert Triggered`;
      body = `${symbol} is now $${currentPrice.toFixed(2)}, below your threshold of $${threshold.toFixed(2)}`;
    } else if (alertType === 'percentage_move') {
      const percentage = ((currentPrice - threshold) / threshold * 100).toFixed(1);
      title = `${symbol} Price Movement`;
      body = `${symbol} has moved ${percentage}% to $${currentPrice.toFixed(2)}`;
    }

    await this.showNotification({
      title,
      body,
      tag: `alert-${alertData.alertId}`,
      data: {
        url: '/notifications',
        alertId: alertData.alertId,
        symbol,
        type: 'price_alert'
      },
      requireInteraction: true
    });
  }

  async showSystemNotification(title: string, body: string, data?: any): Promise<void> {
    await this.showNotification({
      title,
      body,
      tag: 'system',
      data: {
        url: '/notifications',
        type: 'system',
        ...data
      }
    });
  }

  isPermissionGranted(): boolean {
    if (typeof window === 'undefined') {
      return false;
    }

    // Initialize if not already done
    if (!this.isSupported && 'Notification' in window) {
      this.isSupported = true;
      this.permission = Notification.permission;
    }

    return this.permission === 'granted';
  }

  isSupportedBrowser(): boolean {
    if (typeof window === 'undefined') {
      return false;
    }

    // Initialize if not already done
    if (!this.isSupported && 'Notification' in window) {
      this.isSupported = true;
      this.permission = Notification.permission;
    }

    return this.isSupported;
  }

  getPermissionStatus(): NotificationPermission {
    if (typeof window === 'undefined') {
      return 'denied';
    }

    // Initialize if not already done
    if (!this.isSupported && 'Notification' in window) {
      this.isSupported = true;
      this.permission = Notification.permission;
    }

    return this.permission;
  }
}

// Export singleton instance
export const notificationService = new NotificationService();
