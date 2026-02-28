/**
 * Toast Component
 *
 * Individual toast notification with:
 * - Slide-in/slide-out animations
 * - Progress bar showing time remaining
 * - Clickable to navigate to measure
 * - Dismissible via X button
 * - Pause timer on hover
 */

import { useState, useEffect, useRef } from 'react';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useNotificationStore } from '../../stores/notificationStore';
import { useMeasureStore } from '../../stores/measureStore';

const ICON_MAP = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const STYLE_MAP = {
  success: {
    bg: 'bg-white',
    border: 'border-emerald-500',
    iconBg: 'bg-emerald-50',
    iconColor: 'text-emerald-600',
    progressBg: 'bg-emerald-500',
  },
  error: {
    bg: 'bg-white',
    border: 'border-red-500',
    iconBg: 'bg-red-50',
    iconColor: 'text-red-600',
    progressBg: 'bg-red-500',
  },
  warning: {
    bg: 'bg-white',
    border: 'border-amber-500',
    iconBg: 'bg-amber-50',
    iconColor: 'text-amber-600',
    progressBg: 'bg-amber-500',
  },
  info: {
    bg: 'bg-white',
    border: 'border-blue-500',
    iconBg: 'bg-blue-50',
    iconColor: 'text-blue-600',
    progressBg: 'bg-blue-500',
  },
};

export function Toast({ notification }) {
  const navigate = useNavigate();
  const { removeNotification, pauseTimer, resumeTimer } = useNotificationStore();
  const { setActiveMeasure } = useMeasureStore();

  const [isExiting, setIsExiting] = useState(false);
  const [progress, setProgress] = useState(100);
  const progressRef = useRef(null);
  const startTimeRef = useRef(Date.now());

  const Icon = ICON_MAP[notification.type] || Info;
  const styles = STYLE_MAP[notification.type] || STYLE_MAP.info;

  // Animate progress bar
  useEffect(() => {
    if (notification.isPaused || notification.duration <= 0) return;

    const animate = () => {
      const elapsed = Date.now() - startTimeRef.current;
      const remaining = Math.max(0, notification.duration - elapsed);
      const progressPercent = (remaining / notification.duration) * 100;

      setProgress(progressPercent);

      if (progressPercent > 0) {
        progressRef.current = requestAnimationFrame(animate);
      }
    };

    progressRef.current = requestAnimationFrame(animate);

    return () => {
      if (progressRef.current) {
        cancelAnimationFrame(progressRef.current);
      }
    };
  }, [notification.duration, notification.isPaused]);

  // Handle pause/resume
  useEffect(() => {
    if (notification.isPaused) {
      if (progressRef.current) {
        cancelAnimationFrame(progressRef.current);
      }
    } else {
      startTimeRef.current = Date.now() - (notification.duration - notification.remainingTime);
    }
  }, [notification.isPaused, notification.duration, notification.remainingTime]);

  const handleDismiss = (e) => {
    e.stopPropagation();
    setIsExiting(true);
    setTimeout(() => {
      removeNotification(notification.id);
    }, 300); // Match animation duration
  };

  const handleClick = () => {
    if (notification.measureId) {
      setActiveMeasure(notification.measureId);
      navigate('/editor');
      // Dismiss after navigation
      setIsExiting(true);
      setTimeout(() => {
        removeNotification(notification.id);
      }, 300);
    }
  };

  const handleMouseEnter = () => {
    pauseTimer(notification.id);
  };

  const handleMouseLeave = () => {
    resumeTimer(notification.id);
  };

  return (
    <div
      className={`
        relative w-96 rounded-lg shadow-lg border-l-4 overflow-hidden
        transition-all duration-300 ease-out
        ${styles.bg} ${styles.border}
        ${isExiting ? 'translate-x-full opacity-0' : 'translate-x-0 opacity-100'}
        ${notification.measureId ? 'cursor-pointer hover:shadow-xl' : ''}
      `}
      style={{
        animation: isExiting ? 'none' : 'slideInRight 0.3s ease-out',
      }}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Main content */}
      <div className="p-4 flex items-start gap-3">
        {/* Icon */}
        <div className={`flex-shrink-0 w-10 h-10 rounded-full ${styles.iconBg} flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${styles.iconColor}`} />
        </div>

        {/* Text content */}
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-gray-900">
            {notification.title}
          </h4>
          <p className="text-sm text-gray-600 mt-0.5 truncate">
            {notification.message}
          </p>
          {notification.measureId && (
            <p className="text-xs text-gray-400 mt-1">
              Click to review
            </p>
          )}
        </div>

        {/* Dismiss button */}
        {notification.dismissible && (
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Action button if provided */}
      {notification.action && (
        <div className="px-4 pb-3">
          <button
            onClick={(e) => {
              e.stopPropagation();
              notification.action.onClick();
            }}
            className="text-sm font-medium text-emerald-600 hover:text-emerald-700 transition-colors"
          >
            {notification.action.label}
          </button>
        </div>
      )}

      {/* Progress bar */}
      {notification.duration > 0 && (
        <div className="h-1 bg-gray-100">
          <div
            className={`h-full ${styles.progressBg} transition-none`}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
}
