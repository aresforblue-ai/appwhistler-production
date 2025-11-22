import AppIcon from './AppIcon';

function AppCard({ app }) {
  const truthScore = app.truthRating || 0;
  const badge = truthScore >= 85 ? { text: 'High Trust', emoji: '✓', bg: 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-400' } :
                 truthScore >= 70 ? { text: 'Moderate', emoji: '⚠', bg: 'bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-900 text-amber-700 dark:text-amber-400' } :
                 { text: 'Low Trust', emoji: '!', bg: 'bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-400' };
  const scoreColor = truthScore >= 85 ? 'from-emerald-500 to-green-500' : truthScore >= 70 ? 'from-amber-500 to-orange-500' : 'from-rose-500 to-red-500';

  return (
    <div className="group relative bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 border-2 border-slate-200 dark:border-slate-800 hover:border-blue-500/50 dark:hover:border-blue-500/50 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-500">
      <div className="flex items-start justify-between mb-5">
        <AppIcon app={app} />
        {app.isVerified && (
          <div className="px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-900 flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="text-[10px] font-black text-blue-700 dark:text-blue-300 uppercase tracking-wide">Verified</span>
          </div>
        )}
      </div>

      <h3 className="text-2xl font-display font-black mb-3 text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{app.name}</h3>

      <div className="mb-4">
        <span className="inline-block px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
          {app.category || 'general'}
        </span>
      </div>

      <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 leading-relaxed line-clamp-2">{app.description || 'No description available'}</p>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Truth Score</span>
          <div className={`px-3 py-1.5 rounded-lg border ${badge.bg} text-xs font-bold flex items-center gap-1.5`}>
            <span>{badge.emoji}</span>
            <span>{badge.text}</span>
          </div>
        </div>

        <div className="relative pt-2">
          <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full bg-gradient-to-r ${scoreColor} transition-all duration-1000 rounded-full`}
              style={{ width: `${truthScore}%` }}
            />
          </div>
          <div className="absolute top-0 right-0">
            <span className="text-3xl font-black text-slate-900 dark:text-white">
              {truthScore}
              <span className="text-sm text-slate-400">%</span>
            </span>
          </div>
        </div>
      </div>

      <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-center gap-2 text-sm text-slate-400 dark:text-slate-500">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <span className="font-semibold">Coming Soon</span>
        </div>
      </div>
    </div>
  );
}

export default AppCard;
