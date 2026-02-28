/**
 * Notification Store
 *
 * Manages toast notifications across the application.
 * Supports success, error, warning, and info notifications.
 * Toasts auto-dismiss after a configurable duration.
 */

import { create } from 'zustand';

const DEFAULT_DURATION = 10000; // 10 seconds as per requirements

export const useNotificationStore = create((set, get) => ({
  // Array of active notifications
  notifications: [],

  // Add a new notification
  addNotification: ({
    type = 'info', // 'success' | 'error' | 'warning' | 'info'
    title,
    message,
    duration = DEFAULT_DURATION,
    measureId = null, // For navigation on click
    cmsId = null,
    measureName = null,
    dismissible = true,
    action = null, // { label: string, onClick: () => void }
  }) => {
    const id = `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const createdAt = Date.now();

    const notification = {
      id,
      type,
      title,
      message,
      duration,
      measureId,
      cmsId,
      measureName,
      dismissible,
      action,
      createdAt,
      // Track remaining time for progress bar
      remainingTime: duration,
      isPaused: false,
    };

    set((state) => ({
      notifications: [notification, ...state.notifications],
    }));

    // Set up auto-dismiss timer
    if (duration > 0) {
      get().startDismissTimer(id, duration);
    }

    return id;
  },

  // Start or restart the dismiss timer for a notification
  startDismissTimer: (id, duration) => {
    const timeoutId = setTimeout(() => {
      get().removeNotification(id);
    }, duration);

    // Store the timeout ID so we can cancel it if needed
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, timeoutId, timerStartedAt: Date.now() } : n
      ),
    }));
  },

  // Pause the dismiss timer (e.g., on hover)
  pauseTimer: (id) => {
    const notification = get().notifications.find((n) => n.id === id);
    if (!notification || notification.isPaused) return;

    // Clear the existing timeout
    if (notification.timeoutId) {
      clearTimeout(notification.timeoutId);
    }

    // Calculate remaining time
    const elapsed = Date.now() - (notification.timerStartedAt || notification.createdAt);
    const remainingTime = Math.max(0, notification.duration - elapsed);

    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id
          ? { ...n, isPaused: true, remainingTime, timeoutId: null }
          : n
      ),
    }));
  },

  // Resume the dismiss timer
  resumeTimer: (id) => {
    const notification = get().notifications.find((n) => n.id === id);
    if (!notification || !notification.isPaused) return;

    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, isPaused: false } : n
      ),
    }));

    // Restart timer with remaining time
    if (notification.remainingTime > 0) {
      get().startDismissTimer(id, notification.remainingTime);
    }
  },

  // Remove a notification
  removeNotification: (id) => {
    const notification = get().notifications.find((n) => n.id === id);
    if (notification?.timeoutId) {
      clearTimeout(notification.timeoutId);
    }

    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    }));
  },

  // Clear all notifications
  clearAll: () => {
    // Clear all timeouts
    get().notifications.forEach((n) => {
      if (n.timeoutId) {
        clearTimeout(n.timeoutId);
      }
    });

    set({ notifications: [] });
  },

  // Helper to show success notification
  success: (title, message, options = {}) => {
    return get().addNotification({ type: 'success', title, message, ...options });
  },

  // Helper to show error notification
  error: (title, message, options = {}) => {
    return get().addNotification({ type: 'error', title, message, ...options });
  },

  // Helper to show warning notification
  warning: (title, message, options = {}) => {
    return get().addNotification({ type: 'warning', title, message, ...options });
  },

  // Helper to show info notification
  info: (title, message, options = {}) => {
    return get().addNotification({ type: 'info', title, message, ...options });
  },
}));
