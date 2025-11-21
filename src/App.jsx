import { useState, useEffect } from 'react';
import { useQuery } from '@apollo/client';
import { GET_TRENDING_APPS } from './graphql/queries';

function App() {
  const [darkMode, setDarkMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const categories = ['all', 'news', 'research', 'verification', 'social'];

  // Fetch real apps from GraphQL backend
  const { loading, error, data } = useQuery(GET_TRENDING_APPS, {
    variables: { limit: 20 },
  });

  const apps = data?.trendingApps || [];

  useEffect(() => {
    const savedMode = localStorage.getItem('darkMode');
    if (savedMode === 'true') {
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-sky-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800 animate-gradient">
        
        <header className="sticky top-0 z-50 backdrop-blur-xl bg-gradient-to-b from-white/60 via-white/40 to-transparent dark:from-slate-950/60 dark:via-slate-950/40 dark:to-transparent border-b border-white/20 dark:border-slate-700/20">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 fade-in">
                <div className="relative w-11 h-11 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center shadow-lg glow-blue">
                  <span className="text-2xl">🛡️</span>
                  <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-sky-500 rounded-full flex items-center justify-center text-[10px] shadow-md">✓</div>
                </div>
                <div>
                  <h1 className="text-lg font-display font-semibold text-slate-800 dark:text-slate-100 tracking-tight">AppWhistler</h1>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium tracking-wide">TRUTH-VERIFIED APPS</p>
                </div>
              </div>
              <button onClick={toggleDarkMode} className="p-2.5 rounded-xl glass dark:glass-dark hover:scale-105 transition-all">
                <span className="text-xl">{darkMode ? '☀️' : '🌙'}</span>
              </button>
            </div>
          </div>
        </header>

        <section className="max-w-7xl mx-auto px-6 py-16 fade-in-delay-2">
          <div className="text-center mb-12">
            <h2 className="text-5xl md:text-6xl font-display font-bold mb-5 text-slate-800 dark:text-slate-100 tracking-tight">
              Truth-First Discovery
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto mb-8 font-normal">
              AI-powered app recommendations with built-in fact-checking to combat disinformation
            </p>
            
            <div className="flex items-center justify-center gap-8 mb-8">
              <div className="text-center">
                <div className="text-3xl font-bold text-sky-600 dark:text-sky-400">{apps.length}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">Apps Verified</div>
              </div>
              <div className="w-px h-10 bg-slate-300 dark:bg-slate-700"></div>
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">50/50</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">DAO Split</div>
              </div>
              <div className="w-px h-10 bg-slate-300 dark:bg-slate-700"></div>
              <div className="text-center">
                <div className="text-3xl">🤖</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">AI Powered</div>
              </div>
            </div>
          </div>

          <div className="max-w-2xl mx-auto mb-8 fade-in-delay-3">
            <div className="relative">
              <input
                type="text"
                placeholder="Search apps by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-6 py-4 pl-12 rounded-2xl glass dark:glass-dark border-2 border-transparent focus:border-sky-400 dark:focus:border-sky-500 outline-none text-slate-800 dark:text-slate-100 placeholder-slate-400 text-base font-medium"
              />
              <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-xl text-slate-400">🔍</div>
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-lg font-bold">
                  ✕
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-2.5 mb-12">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-all ${
                  selectedCategory === cat
                    ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-lg glow-blue scale-105'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-sky-400 dark:hover:border-sky-500'
                }`}
              >
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </button>
            ))}
          </div>

          <div className="text-center mb-6">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Showing <span className="font-bold text-sky-600 dark:text-sky-400">{filteredApps.length}</span> of {apps.length} apps
            </p>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="text-center py-20">
              <div className="inline-block w-16 h-16 border-4 border-sky-500 border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-slate-600 dark:text-slate-400 font-medium">Loading truth-verified apps...</p>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="text-center py-20">
              <div className="text-6xl mb-4">⚠️</div>
              <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">Connection Error</h3>
              <p className="text-slate-600 dark:text-slate-400 mb-4">Unable to connect to backend server</p>
              <p className="text-sm text-slate-500 dark:text-slate-500 mb-6">Make sure the backend is running on port 5000</p>
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-3 bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-xl font-semibold hover:scale-105 transition-transform shadow-lg"
              >
                Retry Connection
              </button>
            </div>
          )}

          {/* Apps Grid */}
          {!loading && !error && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredApps.map((app) => (
                <AppCard key={app.id} app={app} />
              ))}
            </div>
          )}

          {/* No Results State */}
          {!loading && !error && filteredApps.length === 0 && apps.length > 0 && (
            <div className="text-center py-20">
              <div className="text-6xl mb-4">🔍</div>
              <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">No apps found</h3>
              <p className="text-slate-600 dark:text-slate-400 mb-6">Try adjusting your search or filters</p>
              <button
                onClick={() => { setSearchQuery(''); setSelectedCategory('all'); }}
                className="px-6 py-3 bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-xl font-semibold hover:scale-105 transition-transform shadow-lg"
              >
                Clear Filters
              </button>
            </div>
          )}
        </section>

        <footer className="border-t border-slate-200 dark:border-slate-800 glass dark:glass-dark mt-20">
          <div className="max-w-7xl mx-auto px-6 py-6 text-center">
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Built with ❤️ to combat disinformation</p>
            <p className="text-xs text-slate-400 dark:text-slate-500">Powered by Grok AI • Truth DAO • Ethereum</p>
          </div>
        </footer>
      </div>
    </div>
  );
}

function AppCard({ app }) {
  const getScoreColor = (score) => {
    if (score >= 85) return 'from-emerald-400 to-green-500';
    if (score >= 70) return 'from-amber-400 to-orange-500';
    return 'from-rose-400 to-red-500';
  };

  const getScoreBadge = (score) => {
    if (score >= 85) return { text: 'High Trust', emoji: '✓', bg: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-700 text-emerald-700 dark:text-emerald-400' };
    if (score >= 70) return { text: 'Moderate', emoji: '⚠', bg: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700 text-amber-700 dark:text-amber-400' };
    return { text: 'Low Trust', emoji: '!', bg: 'bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-700 text-rose-700 dark:text-rose-400' };
  };

  // Use truthRating from backend (GraphQL schema)
  const truthScore = app.truthRating || 0;
  const badge = getScoreBadge(truthScore);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 card-hover border border-slate-200 dark:border-slate-800 shadow-sm">
      <div className="flex items-start justify-between mb-4">
        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center text-white text-xl font-bold shadow-md glow-blue">
          {app.name.charAt(0)}
        </div>
        {app.isVerified && (
          <div className="px-2.5 py-1 rounded-full bg-sky-50 dark:bg-sky-900/20 border border-sky-200 dark:border-sky-800 text-sky-700 dark:text-sky-400 text-[11px] font-bold flex items-center gap-1">
            <span>🛡️</span>
            <span>VERIFIED</span>
          </div>
        )}
      </div>
      
      <h3 className="text-xl font-display font-bold mb-2 text-slate-800 dark:text-slate-100">{app.name}</h3>
      
      <div className="mb-3">
        <span className="inline-block px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400 uppercase tracking-wider">
          {app.category || 'general'}
        </span>
      </div>
      
      <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">{app.description || 'No description available'}</p>
      
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Truth Score</span>
          <div className={`px-2.5 py-1 rounded-full border ${badge.bg} text-[11px] font-bold flex items-center gap-1`}>
            <span>{badge.emoji}</span>
            <span>{badge.text}</span>
          </div>
        </div>
        
        <div className="relative">
          <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div 
              className={`h-full bg-gradient-to-r ${getScoreColor(truthScore)} transition-all duration-1000 rounded-full`}
              style={{ width: `${truthScore}%` }}
            />
          </div>
          <div className="absolute -top-1 right-0">
            <span className="text-2xl font-bold text-slate-800 dark:text-slate-100">
              {truthScore}
              <span className="text-sm text-slate-400">%</span>
            </span>
          </div>
        </div>
      </div>
      
      <button className="w-full mt-6 py-3 bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-xl text-sm font-bold hover:scale-[1.02] transition-transform shadow-md">
        View Details
      </button>
    </div>
  );
}

export default App;