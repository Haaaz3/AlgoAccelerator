/**
 * ToastContainer Component
 *
 * Global container for toast notifications.
 * Renders in top-right corner of viewport.
 * Stacks multiple toasts vertically (newest on top).
 */

import { useNotificationStore } from '../../stores/notificationStore';
import { Toast } from './Toast';

export function ToastContainer() {
  const { notifications } = useNotificationStore();

  if (notifications.length === 0) {
    return null;
  }

  return (
    <div
      className="fixed top-4 right-4 z-[100] flex flex-col gap-3 pointer-events-none"
      aria-live="polite"
      aria-label="Notifications"
    >
      {notifications.map((notification) => (
        <div key={notification.id} className="pointer-events-auto">
          <Toast notification={notification} />
        </div>
      ))}
    </div>
  );
}
