// src/frontend/src/components/NotificationCenter.jsx
// Toast-based notification display with animations

import React, { useState, useEffect } from 'react';
import notificationService from '../utils/NotificationService';

const NotificationCenter = () => {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const unsubscribe = notificationService.subscribe(setNotifications);
    return unsubscribe;
  }, []);

  const getIcon = (type) => {
    const icons = {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️'
    };
    return icons[type] || icons.info;
  };

  const getStyles = (type) => {
    const styles = {
      success: 'bg-green-900/90 border-green-700',
      error: 'bg-red-900/90 border-red-700',
      warning: 'bg-yellow-900/90 border-yellow-700',
      info: 'bg-blue-900/90 border-blue-700'
    };
    return styles[type] || styles.info;
  };

  return (
    <div className="fixed top-4 right-4 z-50 max-w-md space-y-3">
      {notifications.map((notif) => (
        <div
          key={notif.id}
          className={`
            animate-slideIn border rounded-lg p-4 text-white
            backdrop-blur-sm shadow-lg
            ${getStyles(notif.type)}
          `}
        >
          <div className="flex items-start gap-3">
            <span className="text-xl mt-0.5 flex-shrink-0">
              {getIcon(notif.type)}
            </span>
            <div className="flex-1">
              <p className="text-sm font-medium">{notif.message}</p>
            </div>
            <button
              onClick={() => notificationService.remove(notif.id)}
              className="text-white/70 hover:text-white transition-colors flex-shrink-0"
            >
              ✕
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default NotificationCenter;
