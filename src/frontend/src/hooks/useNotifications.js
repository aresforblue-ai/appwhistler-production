// src/frontend/src/hooks/useNotifications.js
// Hook for subscribing to real-time notification updates

import { useEffect, useCallback } from 'react';
import { useSubscription } from '@apollo/client';
import notificationService from '../utils/NotificationService';
import { gql } from '@apollo/client';

// GraphQL subscription query
export const ON_NOTIFICATION = gql`
  subscription OnNotification($userId: ID!) {
    notificationAdded(userId: $userId) {
      id
      type
      title
      message
      data
      createdAt
    }
  }
`;

export const useNotifications = (userId) => {
  const { data, error } = useSubscription(ON_NOTIFICATION, {
    variables: { userId },
    skip: !userId
  });

  useEffect(() => {
    if (data?.notificationAdded) {
      const notif = data.notificationAdded;
      const message = `${notif.title}: ${notif.message}`;

      // Show in-app toast
      notificationService.notify(message, notif.type || 'info', 5000);

      // Show push notification if permission granted
      if ('Notification' in window && Notification.permission === 'granted') {
        notificationService.pushNotify(notif.title, {
          body: notif.message,
          type: notif.type,
          onClick: () => {
            // Handle notification click (navigate to relevant page)
            if (notif.data?.appId) {
              window.location.hash = `/app/${notif.data.appId}`;
            }
          }
        });
      }
    }
  }, [data]);

  useEffect(() => {
    if (error) {
      console.error('Notification subscription error:', error);
      notificationService.notify('Failed to load notifications', 'error', 5000);
    }
  }, [error]);

  return {
    isConnected: !error && data !== undefined,
    error
  };
};

export default useNotifications;
