// src/frontend/src/utils/NotificationService.js
// Centralized notification management (in-app + push)

export class NotificationService {
  constructor() {
    this.listeners = [];
    this.notifications = [];
    this.requestPermission();
  }

  /**
   * Request browser notification permission
   */
  async requestPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
      try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          console.log('✅ Notifications enabled');
        }
      } catch (error) {
        console.warn('Notification permission request failed:', error);
      }
    }
  }

  /**
   * Show in-app notification
   */
  notify(message, type = 'info', duration = 4000) {
    const id = Date.now();
    const notification = { id, message, type, duration };

    this.notifications.push(notification);
    this.listeners.forEach(listener => listener([...this.notifications]));

    if (duration > 0) {
      setTimeout(() => {
        this.notifications = this.notifications.filter(n => n.id !== id);
        this.listeners.forEach(listener => listener([...this.notifications]));
      }, duration);
    }

    return id;
  }

  /**
   * Show push notification
   */
  pushNotify(title, options = {}) {
    if (!('Notification' in window) || Notification.permission !== 'granted') {
      this.notify(title, options.type || 'info');
      return;
    }

    try {
      const notification = new Notification(title, {
        icon: '/icon-192x192.png',
        badge: '/badge-72x72.png',
        ...options
      });

      notification.onclick = () => {
        window.focus();
        if (options.onClick) options.onClick();
      };

      // Auto-close after 5 seconds
      setTimeout(() => notification.close(), 5000);
    } catch (error) {
      console.error('Push notification failed:', error);
      this.notify(title, options.type || 'info');
    }
  }

  /**
   * Subscribe to notification changes
   */
  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  /**
   * Clear all notifications
   */
  clearAll() {
    this.notifications = [];
    this.listeners.forEach(listener => listener([]));
  }

  /**
   * Remove specific notification
   */
  remove(id) {
    this.notifications = this.notifications.filter(n => n.id !== id);
    this.listeners.forEach(listener => listener([...this.notifications]));
  }
}

export const notificationService = new NotificationService();

export default notificationService;
