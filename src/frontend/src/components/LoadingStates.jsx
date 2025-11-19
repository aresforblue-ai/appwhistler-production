// src/frontend/src/components/LoadingStates.jsx
// Skeleton loaders and loading indicators

import React from 'react';

/**
 * Skeleton card for loading state
 */
export const SkeletonCard = ({ count = 1 }) => (
  <div className="space-y-4">
    {Array(count).fill(0).map((_, i) => (
      <div key={i} className="bg-slate-700 rounded-lg p-6 animate-pulse">
        <div className="h-6 bg-slate-600 rounded w-3/4 mb-4"></div>
        <div className="space-y-2">
          <div className="h-4 bg-slate-600 rounded w-full"></div>
          <div className="h-4 bg-slate-600 rounded w-5/6"></div>
          <div className="h-4 bg-slate-600 rounded w-4/6"></div>
        </div>
      </div>
    ))}
  </div>
);

/**
 * Skeleton grid for app listings
 */
export const SkeletonGrid = ({ cols = 2, count = 4 }) => (
  <div className={`grid grid-cols-${cols} gap-4`}>
    {Array(count).fill(0).map((_, i) => (
      <div key={i} className="bg-slate-700 rounded-lg h-48 animate-pulse"></div>
    ))}
  </div>
);

/**
 * Spinner overlay for async operations
 */
export const Spinner = ({ size = 'md', message = null }) => {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4'
  };

  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <div className={`${sizeClasses[size]} border-slate-600 border-t-blue-500 rounded-full animate-spin`}></div>
      {message && <p className="text-slate-400 text-sm">{message}</p>}
    </div>
  );
};

/**
 * Loading overlay (centered on page)
 */
export const LoadingOverlay = ({ visible = true, message = 'Loading...' }) => {
  if (!visible) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-slate-800 rounded-lg p-8 text-center shadow-xl">
        <Spinner size="lg" message={message} />
      </div>
    </div>
  );
};

/**
 * Pulse animation for interactive elements
 */
export const PulseLoader = () => (
  <div className="flex gap-2">
    {[0, 1, 2].map(i => (
      <div
        key={i}
        className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"
        style={{ animationDelay: `${i * 0.1}s` }}
      ></div>
    ))}
  </div>
);

/**
 * Skeleton form for login/signup
 */
export const SkeletonForm = () => (
  <div className="space-y-4 animate-pulse">
    <div className="h-10 bg-slate-600 rounded-lg"></div>
    <div className="h-10 bg-slate-600 rounded-lg"></div>
    <div className="h-12 bg-blue-600 rounded-lg"></div>
  </div>
);

/**
 * Skeleton profile card
 */
export const SkeletonProfile = () => (
  <div className="bg-slate-700 rounded-lg p-6 animate-pulse">
    <div className="flex gap-4">
      <div className="w-16 h-16 bg-slate-600 rounded-full"></div>
      <div className="flex-1 space-y-2">
        <div className="h-6 bg-slate-600 rounded w-1/3"></div>
        <div className="h-4 bg-slate-600 rounded w-1/2"></div>
      </div>
    </div>
  </div>
);

export default {
  SkeletonCard,
  SkeletonGrid,
  Spinner,
  LoadingOverlay,
  PulseLoader,
  SkeletonForm,
  SkeletonProfile
};
