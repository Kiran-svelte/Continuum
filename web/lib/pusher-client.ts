// Pusher client for real-time features
import Pusher from 'pusher-js';

let pusherInstance: Pusher | null = null;

export function getPusherClient(): Pusher | null {
  // Only initialize on client side
  if (typeof window === 'undefined') return null;
  
  const pusherKey = process.env.NEXT_PUBLIC_PUSHER_KEY;
  const pusherCluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'ap2';
  
  if (!pusherKey) {
    console.warn('Pusher key not found. Real-time features will be disabled.');
    return null;
  }

  if (!pusherInstance) {
    pusherInstance = new Pusher(pusherKey, {
      cluster: pusherCluster,
      // encrypted: true, // Not needed for newer Pusher versions
    });
  }

  return pusherInstance;
}

export function subscribeToPusherChannel(channelName: string): any {
  const pusher = getPusherClient();
  if (!pusher) return null;
  
  return pusher.subscribe(channelName);
}

export function unsubscribeFromPusherChannel(channelName: string): void {
  const pusher = getPusherClient();
  if (!pusher) return;
  
  pusher.unsubscribe(channelName);
}

// Utility function to get user-specific channel name
export function getUserChannelName(userId: string): string {
  return `user-${userId}`;
}

// Utility function to get company-specific channel name
export function getCompanyChannelName(companyId: string): string {
  return `company-${companyId}`;
}

export type PusherEventType = 
  | 'leave-request-submitted'
  | 'leave-request-approved'
  | 'leave-request-rejected'
  | 'leave-balance-updated'
  | 'sla-breach-warning'
  | 'user-notification';