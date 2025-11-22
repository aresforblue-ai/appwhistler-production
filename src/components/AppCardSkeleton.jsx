// Loading skeleton
function AppCardSkeleton() {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 border-2 border-slate-200 dark:border-slate-800 animate-pulse">
      <div className="flex items-start justify-between mb-5">
        <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl bg-slate-200 dark:bg-slate-800"></div>
        <div className="w-20 h-7 rounded-xl bg-slate-200 dark:bg-slate-800"></div>
      </div>
      <div className="h-7 bg-slate-200 dark:bg-slate-800 rounded-lg w-3/4 mb-3"></div>
      <div className="h-7 bg-slate-200 dark:bg-slate-800 rounded-lg w-20 mb-4"></div>
      <div className="h-10 bg-slate-200 dark:bg-slate-800 rounded-lg mb-6"></div>
      <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded-lg w-full mb-3"></div>
      <div className="h-16 bg-slate-200 dark:bg-slate-800 rounded-lg mb-6"></div>
      <div className="h-12 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
    </div>
  );
}

export default AppCardSkeleton;
