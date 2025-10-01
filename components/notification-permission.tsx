'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Bell, BellOff, CheckCircle, XCircle } from 'lucide-react';
import { notificationService } from '@/lib/notification-service';
import { toast } from 'sonner';

export function NotificationPermission() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isRequesting, setIsRequesting] = useState(false);

  useEffect(() => {
    setPermission(notificationService.getPermissionStatus());
  }, []);

  const handleRequestPermission = async () => {
    setIsRequesting(true);
    try {
      const granted = await notificationService.requestPermission();
      setPermission(notificationService.getPermissionStatus());
      
      if (granted) {
        toast.success('Notification permissions granted!');
      } else {
        toast.error('Notification permissions denied. You can enable them in your browser settings.');
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      toast.error('Failed to request notification permissions');
    } finally {
      setIsRequesting(false);
    }
  };

  const getPermissionStatus = () => {
    switch (permission) {
      case 'granted':
        return {
          icon: <CheckCircle className="w-5 h-5 text-green-600" />,
          text: 'Notifications enabled',
          description: 'You will receive browser notifications for alerts',
          color: 'text-green-600'
        };
      case 'denied':
        return {
          icon: <XCircle className="w-5 h-5 text-red-600" />,
          text: 'Notifications blocked',
          description: 'Enable notifications in your browser settings to receive alerts',
          color: 'text-red-600'
        };
      default:
        return {
          icon: <BellOff className="w-5 h-5 text-yellow-600" />,
          text: 'Notifications not set up',
          description: 'Grant permission to receive browser notifications for alerts',
          color: 'text-yellow-600'
        };
    }
  };

  const status = getPermissionStatus();

  if (!notificationService.isSupportedBrowser()) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellOff className="w-5 h-5" />
            Browser Notifications
          </CardTitle>
          <CardDescription>
            Notifications are not supported in this browser
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Your browser doesn't support notifications. Please use a modern browser like Chrome, Firefox, or Safari.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="w-5 h-5" />
          Browser Notifications
        </CardTitle>
        <CardDescription>
          Control browser notification permissions for price alerts
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          {status.icon}
          <div className="flex-1">
            <p className={`font-medium ${status.color}`}>
              {status.text}
            </p>
            <p className="text-sm text-muted-foreground">
              {status.description}
            </p>
          </div>
        </div>

        {permission !== 'granted' && (
          <Button
            onClick={handleRequestPermission}
            disabled={isRequesting}
            className="w-full"
          >
            {isRequesting ? (
              <>
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                Requesting...
              </>
            ) : (
              <>
                <Bell className="w-4 h-4 mr-2" />
                Enable Notifications
              </>
            )}
          </Button>
        )}

        {permission === 'denied' && (
          <div className="p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              <strong>To enable notifications:</strong>
            </p>
            <ol className="text-sm text-yellow-700 dark:text-yellow-300 mt-1 ml-4 list-decimal">
              <li>Click the lock icon in your browser's address bar</li>
              <li>Select "Allow" for notifications</li>
              <li>Refresh this page</li>
            </ol>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
