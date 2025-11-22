import AppIcon from './AppIcon';

function AppCard({ app }) {
  const truthScore = app.truthRating || 0;
  const badge = truthScore >= 85 ? { text: 'High Trust', emoji: '✓', bg: 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-400' } :
                 truthScore >= 70 ? { text: 'Moderate', emoji: '⚠', bg: 'bg-amber-50 dark:bg-amber-900/30 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400' } :
                 { text: 'Low Trust', emoji: '!', bg: 'bg-rose-50 dark:bg-rose-900/30 border-rose-300 dark:border-rose-700 text-rose-700 dark:text-rose-400' };
  const scoreColor = truthScore >= 85 ? 'from-emerald-400 to-green-500' : truthScore >= 70 ? 'from-amber-400 to-orange-500' : 'from-rose-400 to-red-500';

  return (
    <div className="bg-white dark:bg-fog-900 rounded-2xl p-5 sm:p-6 hover:shadow-xl hover:scale-[1.02] active:scale-[1.01] transition-all duration-300 border border-fog-200 dark:border-fog-800 group touch-manipulation">
      <div className="flex items-start justify-between mb-4">
        <AppIcon app={app} />
        {app.isVerified && (
          <div className="px-2.5 py-1 rounded-full bg-ice-50 dark:bg-ice-900/30 border border-ice-300 dark:border-ice-800 text-ice-700 dark:text-ice-400 text-[10px] font-black flex items-center gap-1 shadow-md">
            <span className="text-sm">🛡️</span>
            <span>VERIFIED</span>
          </div>
        )}
      </div>

      <h3 className="text-xl sm:text-2xl font-display font-black mb-3 text-fog-800 dark:text-fog-100 group-hover:text-ice-600 dark:group-hover:text-ice-400 transition-colors">{app.name}</h3>

      <div className="mb-3">
        <span className="inline-block px-2.5 py-1 rounded-full text-[10px] font-black bg-ice-50 dark:bg-ice-900/30 border border-ice-300 dark:border-ice-800 text-ice-700 dark:text-ice-400 uppercase tracking-wider shadow-sm">
          {app.category || 'general'}
        </span>
      </div>

      <p className="text-sm text-fog-600 dark:text-fog-400 mb-5 leading-relaxed line-clamp-3">{app.description || 'No description available'}</p>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black text-fog-500 dark:text-fog-400 uppercase tracking-wider">Truth Score</span>
          <div className={`px-2.5 py-1 rounded-full border ${badge.bg} text-[10px] font-black flex items-center gap-1 shadow-md`}>
            <span>{badge.emoji}</span>
            <span>{badge.text}</span>
          </div>
        </div>

        <div className="relative">
          <div className="w-full h-2.5 bg-fog-100 dark:bg-fog-800 rounded-full overflow-hidden shadow-inner">
            <div
              className={`h-full bg-gradient-to-r ${scoreColor} transition-all duration-1000 rounded-full shadow-md`}
              style={{ width: `${truthScore}%` }}
            />
          </div>
          <div className="absolute -top-1 right-0">
            <span className="text-2xl sm:text-3xl font-black text-fog-800 dark:text-fog-100">
              {truthScore}
              <span className="text-xs text-fog-400">%</span>
            </span>
          </div>
        </div>
      </div>

      <div className="w-full mt-5 py-3 sm:py-3.5 bg-gradient-to-r from-ice-500 to-ice-600 text-white rounded-xl text-sm font-black text-center shadow-md opacity-50 cursor-not-allowed">
        View Details →
      </div>
    </div>
  );
}

export default AppCard;
