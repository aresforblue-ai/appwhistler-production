import AppIcon from './AppIcon';

function AppCard({ app }) {
  const truthScore = app.truthRating || 0;
  const badge = truthScore >= 85 ? { text: 'High Trust', emoji: '✓', bg: 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-400' } :
                 truthScore >= 70 ? { text: 'Moderate', emoji: '⚠', bg: 'bg-amber-50 dark:bg-amber-900/30 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400' } :
                 { text: 'Low Trust', emoji: '!', bg: 'bg-rose-50 dark:bg-rose-900/30 border-rose-300 dark:border-rose-700 text-rose-700 dark:text-rose-400' };
  const scoreColor = truthScore >= 85 ? 'from-emerald-400 to-green-500' : truthScore >= 70 ? 'from-amber-400 to-orange-500' : 'from-rose-400 to-red-500';

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl p-7 hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 border-2 border-slate-200 dark:border-slate-800 group">
      <div className="flex items-start justify-between mb-5">
        <AppIcon app={app} />
        {app.isVerified && (
          <div className="px-3 py-1.5 rounded-full bg-sky-50 dark:bg-sky-900/30 border-2 border-sky-300 dark:border-sky-800 text-sky-700 dark:text-sky-400 text-xs font-black flex items-center gap-1.5 shadow-lg">
            <span className="text-base">🛡️</span>
            <span>VERIFIED</span>
          </div>
        )}
      </div>

      <h3 className="text-2xl font-display font-black mb-3 text-slate-800 dark:text-slate-100 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">{app.name}</h3>

      <div className="mb-4">
        <span className="inline-block px-3 py-1.5 rounded-full text-xs font-black bg-blue-50 dark:bg-blue-900/30 border-2 border-blue-300 dark:border-blue-800 text-blue-700 dark:text-blue-400 uppercase tracking-wider shadow-md">
          {app.category || 'general'}
        </span>
      </div>

      <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 leading-relaxed line-clamp-3">{app.description || 'No description available'}</p>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">Truth Score</span>
          <div className={`px-3 py-1.5 rounded-full border-2 ${badge.bg} text-xs font-black flex items-center gap-1.5 shadow-lg`}>
            <span>{badge.emoji}</span>
            <span>{badge.text}</span>
          </div>
        </div>

        <div className="relative">
          <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden shadow-inner">
            <div
              className={`h-full bg-gradient-to-r ${scoreColor} transition-all duration-1000 rounded-full shadow-lg`}
              style={{ width: `${truthScore}%` }}
            />
          </div>
          <div className="absolute -top-2 right-0">
            <span className="text-3xl font-black text-slate-800 dark:text-slate-100">
              {truthScore}
              <span className="text-sm text-slate-400">%</span>
            </span>
          </div>
        </div>
      </div>

      <button className="w-full mt-7 py-4 bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-xl text-sm font-black hover:scale-[1.03] hover:shadow-2xl transition-all duration-300 shadow-xl">
        View Details →
      </button>
    </div>
  );
}

export default AppCard;
