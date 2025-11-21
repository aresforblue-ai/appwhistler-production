// Loading skeleton
function AppCardSkeleton() {
  return (
    <div className="bg-white dark:bg-fog-900 rounded-2xl p-5 sm:p-6 border border-fog-200 dark:border-fog-800 shadow-sm animate-pulse">
      <div className="flex items-start justify-between mb-4">
        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-fog-200 dark:bg-fog-800"></div>
        <div className="w-16 sm:w-20 h-5 sm:h-6 rounded-full bg-fog-200 dark:bg-fog-800"></div>
      </div>
      <div className="h-5 sm:h-6 bg-fog-200 dark:bg-fog-800 rounded w-3/4 mb-3"></div>
      <div className="h-4 bg-fog-200 dark:bg-fog-800 rounded w-1/2 mb-4"></div>
      <div className="h-16 sm:h-20 bg-fog-200 dark:bg-fog-800 rounded mb-4"></div>
      <div className="h-2.5 sm:h-3 bg-fog-200 dark:bg-fog-800 rounded w-full mb-2"></div>
      <div className="h-9 sm:h-10 bg-fog-200 dark:bg-fog-800 rounded"></div>
    </div>
  );
}

export default AppCardSkeleton;
