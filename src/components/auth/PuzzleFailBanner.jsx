/**
 * PuzzleFailBanner
 *
 * A dismissible but persistent error banner shown when
 * the user failed the chess puzzle but was still let in.
 */

import { useState } from 'react';
import { X, Frown } from 'lucide-react';

export function PuzzleFailBanner({ onDismiss }) {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  const handleDismiss = () => {
    setIsVisible(false);
    onDismiss?.();
  };

  return (
    <div className="bg-gradient-to-r from-red-900/90 via-red-800/90 to-red-900/90 border-b border-red-700">
      <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Frown className="w-5 h-5 text-red-300 flex-shrink-0" />
          <p className="text-sm text-red-100">
            <span className="font-semibold">You failed the puzzle.</span>
            {' '}Embarrassing. Try again on your next visit.
          </p>
        </div>
        <button
          onClick={handleDismiss}
          className="p-1 rounded hover:bg-red-700/50 text-red-300 hover:text-red-100 transition-colors"
          aria-label="Dismiss"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}

export default PuzzleFailBanner;
