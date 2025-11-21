// Loading skeleton
function AppCardSkeleton() {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm animate-pulse">
      <div className="flex items-start justify-between mb-4">
        <div className="w-16 h-16 rounded-2xl bg-slate-200 dark:bg-slate-800"></div>
        <div className="w-20 h-6 rounded-full bg-slate-200 dark:bg-slate-800"></div>
      </div>
      <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded w-3/4 mb-3"></div>
      <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/2 mb-4"></div>
      <div className="h-20 bg-slate-200 dark:bg-slate-800 rounded mb-4"></div>
      <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-full mb-2"></div>
      <div className="h-10 bg-slate-200 dark:bg-slate-800 rounded"></div>
    </div>
  );
}

export default AppCardSkeleton;
