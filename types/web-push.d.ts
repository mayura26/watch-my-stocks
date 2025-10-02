declare module 'web-push' {
  export interface PushSubscription {
    endpoint: string;
    keys: {
      p256dh: string;
      auth: string;
    };
  }

  export interface SendNotificationOptions {
    TTL?: number;
    headers?: Record<string, string>;
  }

  export function setVapidDetails(
    subject: string,
    publicKey: string,
    privateKey: string
  ): void;

  export function sendNotification(
    subscription: PushSubscription,
    payload: string,
    options?: SendNotificationOptions
  ): Promise<void>;

  export function generateVapidKeys(): {
    publicKey: string;
    privateKey: string;
  };
}
