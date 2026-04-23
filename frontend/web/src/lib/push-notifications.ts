/**
 * Web Push Notifications Utility
 * Handles Service Worker registration and push subscription
 */

export interface PushSubscriptionJSON {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

/**
 * Register the Service Worker for push notifications
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    console.warn('Service Workers are not supported in this browser');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });
    console.log('Service Worker registered:', registration);
    return registration;
  } catch (error) {
    console.error('Service Worker registration failed:', error);
    return null;
  }
}

/**
 * Check if push notifications are available in this browser
 */
export function isPushNotificationSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

/**
 * Request push notification permission from the user
 */
export async function requestPushPermission(): Promise<NotificationPermission> {
  if (!isPushNotificationSupported()) {
    throw new Error('Push notifications are not supported');
  }

  return Notification.requestPermission();
}

/**
 * Subscribe to push notifications
 * Note: Requires VAPID public key from backend
 */
export async function subscribeToPushNotifications(
  vapidPublicKey: string
): Promise<PushSubscriptionJSON | null> {
  if (!isPushNotificationSupported()) {
    throw new Error('Push notifications are not supported');
  }

  try {
    const registration = await navigator.serviceWorker.ready;

    if (!registration.pushManager) {
      throw new Error('Push Manager is not available');
    }

    // Check if already subscribed
    const existingSubscription = await registration.pushManager.getSubscription();
    if (existingSubscription) {
      return existingSubscription.toJSON() as PushSubscriptionJSON;
    }

    // Subscribe to push notifications
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as unknown as ArrayBuffer,
    });

    return subscription.toJSON() as PushSubscriptionJSON;
  } catch (error) {
    console.error('Failed to subscribe to push notifications:', error);
    throw error;
  }
}

/**
 * Unsubscribe from push notifications
 */
export async function unsubscribeFromPushNotifications(): Promise<boolean> {
  if (!isPushNotificationSupported()) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;

    if (!registration.pushManager) {
      return false;
    }

    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      return await subscription.unsubscribe();
    }

    return true;
  } catch (error) {
    console.error('Failed to unsubscribe from push notifications:', error);
    return false;
  }
}

/**
 * Get current push subscription
 */
export async function getPushSubscription(): Promise<PushSubscriptionJSON | null> {
  if (!isPushNotificationSupported()) {
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.ready;

    if (!registration.pushManager) {
      return null;
    }

    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      return subscription.toJSON() as PushSubscriptionJSON;
    }

    return null;
  } catch (error) {
    console.error('Failed to get push subscription:', error);
    return null;
  }
}

/**
 * Convert VAPID public key from base64 to Uint8Array
 * Required for push subscription
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray as Uint8Array;
}

/**
 * Send push subscription to backend
 */
export async function savePushSubscriptionToBackend(
  subscription: PushSubscriptionJSON
): Promise<boolean> {
  try {
    const response = await fetch('/api/v1/team-chat/push-subscription', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Workspace-Id': JSON.parse(localStorage.getItem('currentWorkspace') || 'null')?.id || '' || '',
      },
      body: JSON.stringify({
        subscription,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to save subscription');
    }

    return true;
  } catch (error) {
    console.error('Failed to save push subscription to backend:', error);
    return false;
  }
}

/**
 * Initialize push notifications
 * Call this on app startup to register service worker and handle permissions
 */
export async function initializePushNotifications(): Promise<void> {
  if (!isPushNotificationSupported()) {
    console.log('Push notifications not supported');
    return;
  }

  try {
    // Register service worker
    const registration = await registerServiceWorker();
    if (!registration) {
      return;
    }

    // Check permission status
    const permission = Notification.permission;
    if (permission === 'default') {
      // Don't request permission automatically - wait for user interaction (mention)
      console.log('Push permission not yet requested');
      return;
    }

    if (permission === 'granted') {
      // Already have permission, check if we need to subscribe
      const subscription = await getPushSubscription();
      if (!subscription) {
        // Note: This would need VAPID public key from backend/env
        console.log('Push notification permission granted but not subscribed');
      }
    }
  } catch (error) {
    console.error('Failed to initialize push notifications:', error);
  }
}

/**
 * Handle soft permission request for push notifications
 * Called when user is mentioned for the first time
 */
export async function requestPushPermissionOnMention(): Promise<void> {
  if (!isPushNotificationSupported()) {
    return;
  }

  try {
    const permission = Notification.permission;

    if (permission === 'default') {
      // Show soft prompt
      const userConsent = confirm(
        'Enable notifications for mentions and direct messages?\n\nYou can disable this anytime in settings.'
      );

      if (userConsent) {
        const result = await requestPushPermission();

        if (result === 'granted') {
          console.log('Push permission granted');
          // Could subscribe here if we have VAPID key from env
        } else if (result === 'denied') {
          console.log('Push permission denied');
        }
      }
    }
  } catch (error) {
    console.error('Failed to request push permission:', error);
  }
}
