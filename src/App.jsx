import { useState, useEffect } from 'react';
import { useQuery } from '@apollo/client';
import { GET_TRENDING_APPS } from './graphql/queries';

// Beautiful app icon with emoji fallbacks
function AppIcon({ app }) {
  const emojis = { news: '📰', research: '🔬', verification: '✅', social: '💬', security: '🔒' };
  const gradients = ['from-blue-500 to-cyan-500', 'from-purple-500 to-pink-500', 'from-green-500 to-emerald-500', 'from-orange-500 to-red-500', 'from-indigo-500 to-purple-500'];
  return (
    <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${gradients[app.name.charCodeAt(0) % 5]} flex items-center justify-center shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-110 hover:rotate-3 relative overflow-hidden group`}>
      <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
      <span className="relative text-3xl filter drop-shadow-lg animate-pulse">{emojis[app.category] || '📱'}</span>
      <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-white/50 backdrop-blur-sm rounded-full flex items-center justify-center text-xs font-black text-slate-800 shadow-lg">
        {app.name.charAt(0)}
      </div>
    </div>
  );
}

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

function App() {
  const [darkMode, setDarkMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const categories = ['all', 'news', 'research', 'verification', 'social', 'security'];

  const { loading, error, data } = useQuery(GET_TRENDING_APPS, { variables: { limit: 20 } });
  const apps = data?.trendingApps || [];

  useEffect(() => {
    const saved = localStorage.getItem('darkMode');
    if (saved === 'true') {
      setDarkMode(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    localStorage.setItem('darkMode', String(newMode));
    document.documentElement.classList.toggle('dark');
  };

  const filteredApps = apps.filter(app => {
    const matchesSearch = app.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || app.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className={darkMode ? 'dark' : ''}>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-sky-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800">
        
        <header className="sticky top-0 z-50 backdrop-blur-2xl bg-gradient-to-b from-white/70 via-white/50 to-transparent dark:from-slate-950/70 dark:via-slate-950/50 border-b border-white/30 dark:border-slate-700/30 shadow-lg">
          <div className="max-w-7xl mx-auto px-6 py-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="relative w-12 h-12 rounded-xl bg-gradient-to-br from-sky-500 via-blue-500 to-indigo-600 flex items-center justify-center shadow-2xl shadow-blue-500/50 hover:shadow-blue-500/70 transition-all duration-300 hover:scale-110 hover:rotate-3">
                  <span className="text-2xl animate-pulse">🛡️</span>
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center text-xs shadow-lg animate-bounce">✓</div>
                </div>
                <div>
                  <h1 className="text-xl font-display font-bold text-slate-800 dark:text-slate-100 tracking-tight">AppWhistler</h1>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold tracking-wider uppercase">Truth-Verified Apps</p>
                </div>
              </div>
              <button onClick={toggleDarkMode} className="p-3 rounded-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm hover:scale-110 transition-all duration-300 shadow-lg hover:shadow-xl">
                <span className="text-2xl">{darkMode ? '☀️' : '🌙'}</span>
              </button>
            </div>
          </div>
        </header>

        <section className="max-w-7xl mx-auto px-6 py-16">
          <div className="text-center mb-12">
            <h2 className="text-5xl md:text-7xl font-display font-black mb-6 bg-gradient-to-r from-blue-600 via-sky-500 to-cyan-500 bg-clip-text text-transparent tracking-tight leading-tight">
              Truth-First Discovery
            </h2>
            <p className="text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto mb-10 font-medium leading-relaxed">
              AI-powered app recommendations with built-in fact-checking to combat disinformation
            </p>
            
            <div className="flex items-center justify-center gap-10 mb-10">
              <div className="text-center group cursor-pointer">
                <div className="text-4xl font-black bg-gradient-to-r from-sky-600 to-blue-600 bg-clip-text text-transparent group-hover:scale-110 transition-transform">{apps.length}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Verified</div>
              </div>
              <div className="w-px h-12 bg-gradient-to-b from-transparent via-slate-300 dark:via-slate-700 to-transparent"></div>
              <div className="text-center group cursor-pointer">
                <div className="text-4xl font-black bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent group-hover:scale-110 transition-transform">50/50</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">DAO Split</div>
              </div>
              <div className="w-px h-12 bg-gradient-to-b from-transparent via-slate-300 dark:via-slate-700 to-transparent"></div>
              <div className="text-center group cursor-pointer">
                <div className="text-4xl animate-bounce">🤖</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">AI Powered</div>
              </div>
            </div>
          </div>

          <div className="max-w-2xl mx-auto mb-10">
            <div className="relative group">
              <input
                type="text"
                placeholder="Search truth-verified apps..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-6 py-5 pl-14 rounded-2xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-2 border-slate-200 dark:border-slate-700 focus:border-sky-500 dark:focus:border-sky-400 outline-none text-slate-800 dark:text-slate-100 placeholder-slate-400 text-lg font-medium shadow-xl transition-all duration-300 focus:shadow-2xl focus:scale-[1.02]"
              />
              <div className="absolute left-5 top-1/2 transform -translate-y-1/2 text-2xl group-focus-within:scale-125 transition-transform">🔍</div>
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-5 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-xl font-bold hover:scale-125 transition-all">
                  ✕
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-3 mb-12">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-6 py-3 rounded-full text-sm font-bold transition-all duration-300 ${
                  selectedCategory === cat
                    ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-2xl shadow-blue-500/50 scale-110'
                    : 'bg-white/90 dark:bg-slate-800/90 text-slate-600 dark:text-slate-300 border-2 border-slate-200 dark:border-slate-700 hover:border-sky-400 dark:hover:border-sky-500 hover:scale-105 backdrop-blur-sm'
                }`}
              >
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </button>
            ))}
          </div>

          {loading && (
            <div>
              <div className="text-center mb-8">
                <div className="inline-block w-16 h-16 border-4 border-sky-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-slate-600 dark:text-slate-400 font-semibold text-lg">Loading truth-verified apps...</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => <AppCardSkeleton key={i} />)}
              </div>
            </div>
          )}

          {error && (
            <div className="text-center py-24 bg-red-50 dark:bg-red-900/20 rounded-3xl border-2 border-red-200 dark:border-red-800">
              <div className="text-7xl mb-6 animate-bounce">⚠️</div>
              <h3 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-3">Connection Error</h3>
              <p className="text-slate-600 dark:text-slate-400 mb-2 text-lg">Unable to connect to backend server</p>
              <p className="text-sm text-slate-500 mb-8">Make sure the backend is running on port 5000</p>
              <button
                onClick={() => window.location.reload()}
                className="px-8 py-4 bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-xl font-bold hover:scale-105 transition-transform shadow-2xl text-lg"
              >
                Retry Connection
              </button>
            </div>
          )}

          {!loading && !error && (
            <>
              <div className="text-center mb-8">
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                  Showing <span className="font-black text-sky-600 dark:text-sky-400 text-lg">{filteredApps.length}</span> of {apps.length} apps
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredApps.map((app) => (
                  <AppCard key={app.id} app={app} />
                ))}
              </div>

              {filteredApps.length === 0 && apps.length > 0 && (
                <div className="text-center py-24">
                  <div className="text-8xl mb-6">🔍</div>
                  <h3 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-3">No apps found</h3>
                  <p className="text-slate-600 dark:text-slate-400 mb-8 text-lg">Try adjusting your search or filters</p>
                  <button
                    onClick={() => { setSearchQuery(''); setSelectedCategory('all'); }}
                    className="px-8 py-4 bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-xl font-bold hover:scale-105 transition-transform shadow-2xl"
                  >
                    Clear Filters
                  </button>
                </div>
              )}
            </>
          )}
        </section>

        <footer className="border-t-2 border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl mt-24 shadow-2xl">
          <div className="max-w-7xl mx-auto px-6 py-8 text-center">
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-2 font-medium">Built with ❤️ to combat disinformation</p>
            <p className="text-xs text-slate-500 dark:text-slate-500 font-semibold">Powered by Grok AI • Truth DAO • Ethereum</p>
          </div>
        </footer>
      </div>
    </div>
  );
}

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

export default App;
