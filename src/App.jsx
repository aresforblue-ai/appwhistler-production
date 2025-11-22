import { useState, useEffect, lazy, Suspense } from 'react';
import { useQuery, useSubscription } from '@apollo/client';
import AppCardSkeleton from './components/AppCardSkeleton';
import { GET_TRENDING_APPS, SEARCH_APPS, FACT_CHECK_ADDED } from './graphql/queries';

// Lazy load AppCard component for code splitting
const AppCard = lazy(() => import('./components/AppCard'));

// App Detail Modal Component
function AppDetailModal({ app, isOpen, onClose, darkMode }) {
  if (!isOpen || !app) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fadeIn" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>

      {/* Modal */}
      <div
        className="relative bg-white dark:bg-slate-900 rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border-2 border-slate-200 dark:border-slate-700"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all hover:scale-110 flex items-center justify-center font-bold text-xl z-10"
        >
          ✕
        </button>

        {/* Content */}
        <div className="p-8">
          {/* Header */}
          <div className="flex items-start gap-6 mb-8">
            <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-sky-400 to-blue-600 dark:from-sky-500 dark:to-blue-700 flex items-center justify-center shadow-2xl">
              <span className="text-5xl">{app.iconUrl || '📱'}</span>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-4xl font-display font-black text-slate-800 dark:text-slate-100">{app.name}</h2>
                {app.isVerified && (
                  <span className="px-3 py-1 rounded-full bg-sky-50 dark:bg-sky-900/30 border-2 border-sky-300 dark:border-sky-800 text-sky-700 dark:text-sky-400 text-xs font-black">
                    🛡️ VERIFIED
                  </span>
                )}
              </div>
              <p className="text-slate-600 dark:text-slate-400 mb-2">{app.developer || 'Unknown Developer'}</p>
              <div className="flex items-center gap-4">
                <span className="px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-800 text-blue-700 dark:text-blue-400 text-xs font-bold uppercase">
                  {app.category || 'general'}
                </span>
                {app.platform && (
                  <span className="text-sm text-slate-500 dark:text-slate-400">
                    {app.platform}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Truth Score */}
          <div className="bg-gradient-to-r from-sky-50 to-blue-50 dark:from-slate-800 dark:to-slate-800/50 rounded-2xl p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">Truth Score</span>
              <span className="text-5xl font-black text-slate-800 dark:text-slate-100">
                {app.truthRating || 0}
                <span className="text-2xl text-slate-400">%</span>
              </span>
            </div>
            <div className="w-full h-4 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className={`h-full bg-gradient-to-r ${
                  (app.truthRating || 0) >= 85 ? 'from-emerald-400 to-green-500' :
                  (app.truthRating || 0) >= 70 ? 'from-amber-400 to-orange-500' :
                  'from-rose-400 to-red-500'
                } transition-all duration-1000 rounded-full`}
                style={{ width: `${app.truthRating || 0}%` }}
              />
            </div>
          </div>

          {/* Description */}
          <div className="mb-6">
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-3">About this app</h3>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              {app.description || 'No description available'}
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {app.downloadCount && (
              <div className="text-center p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                <div className="text-2xl font-black text-sky-600 dark:text-sky-400">
                  {(app.downloadCount / 1000000).toFixed(1)}M
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase">Downloads</div>
              </div>
            )}
            {app.averageRating && (
              <div className="text-center p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                <div className="text-2xl font-black text-amber-600 dark:text-amber-400">
                  {app.averageRating.toFixed(1)} ⭐
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase">Rating</div>
              </div>
            )}
            {app.privacyScore && (
              <div className="text-center p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                <div className="text-2xl font-black text-purple-600 dark:text-purple-400">
                  {app.privacyScore}%
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase">Privacy</div>
              </div>
            )}
            {app.securityScore && (
              <div className="text-center p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                  {app.securityScore}%
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase">Security</div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-4">
            {app.websiteUrl && (
              <a
                href={app.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-4 bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-xl text-center font-black hover:scale-[1.02] hover:shadow-2xl transition-all shadow-xl"
              >
                Visit Website →
              </a>
            )}
            <button
              onClick={onClose}
              className="px-8 py-4 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function App() {
  const [darkMode, setDarkMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedApp, setSelectedApp] = useState(null);
  const [showAppDetail, setShowAppDetail] = useState(false);
  const [showNav, setShowNav] = useState(false);
  const categories = ['all', 'news', 'research', 'verification', 'social', 'security'];

  // Fetch apps from GraphQL API (real-time data)
  const { data, loading, error, refetch } = useQuery(
    searchQuery || selectedCategory !== 'all' ? SEARCH_APPS : GET_TRENDING_APPS,
    {
      variables: searchQuery || selectedCategory !== 'all' ? {
        search: searchQuery || undefined,
        category: selectedCategory !== 'all' ? selectedCategory : undefined,
        limit: 50,
      } : {
        limit: 50,
      },
      pollInterval: 30000, // Refresh every 30 seconds
    }
  );

  // Subscribe to new fact-checks (real-time updates)
  const { data: factCheckData } = useSubscription(FACT_CHECK_ADDED, {
    variables: { category: selectedCategory !== 'all' ? selectedCategory : undefined },
  });

  // Show notification when new fact-check is added
  useEffect(() => {
    if (factCheckData?.factCheckAdded) {
      console.log('New fact-check added:', factCheckData.factCheckAdded);
      // Refetch apps to get updated data
      refetch();
    }
  }, [factCheckData, refetch]);

  const apps = data?.trendingApps || data?.apps?.edges || [];

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

  const handleAppClick = (app) => {
    setSelectedApp(app);
    setShowAppDetail(true);
  };

  // Handle errors
  if (error) {
    console.error('GraphQL Error:', error);
  }

  const filteredApps = apps.filter(app => {
    const matchesSearch = app.name && app.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || app.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className={darkMode ? 'dark' : ''}>
      <div className="min-h-screen bg-gradient-to-br from-sky-100 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-950 dark:to-indigo-950 animate-gradient relative">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-300 dark:bg-purple-900 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-xl opacity-30 dark:opacity-20 animate-blob"></div>
          <div className="absolute top-0 -right-4 w-72 h-72 bg-yellow-300 dark:bg-yellow-900 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-xl opacity-30 dark:opacity-20 animate-blob animation-delay-2000"></div>
          <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-300 dark:bg-pink-900 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-xl opacity-30 dark:opacity-20 animate-blob animation-delay-4000"></div>
        </div>

        <header className="sticky top-0 z-50 backdrop-blur-2xl bg-gradient-to-b from-white/80 via-white/60 to-transparent dark:from-slate-900/90 dark:via-slate-900/70 border-b border-white/40 dark:border-slate-700/40 shadow-xl relative">
          <div className="max-w-7xl mx-auto px-6 py-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-8">
                {/* Logo */}
                <div className="flex items-center gap-4">
                  <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-sky-400 via-blue-500 to-indigo-600 dark:from-sky-500 dark:via-blue-600 dark:to-indigo-700 flex items-center justify-center shadow-2xl shadow-blue-500/50 hover:shadow-blue-600/80 dark:shadow-blue-700/60 dark:hover:shadow-blue-600/80 transition-all duration-300 hover:scale-110 hover:rotate-6 group cursor-pointer">
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/20 to-transparent"></div>
                    <svg className="w-8 h-8 relative z-10 group-hover:scale-110 transition-transform" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 2L3 7V11C3 16.55 6.84 21.74 12 23C17.16 21.74 21 16.55 21 11V7L12 2Z" fill="white" opacity="0.9"/>
                      <path d="M10 17L6 13L7.41 11.59L10 14.17L16.59 7.58L18 9L10 17Z" fill="url(#grad)" opacity="0.95"/>
                      <defs>
                        <linearGradient id="grad" x1="6" y1="7.58" x2="18" y2="17" gradientUnits="userSpaceOnUse">
                          <stop stopColor="#0EA5E9"/>
                          <stop offset="1" stopColor="#3B82F6"/>
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center text-xs shadow-lg animate-bounce border-2 border-white dark:border-slate-900">
                      <span className="text-white font-bold">✓</span>
                    </div>
                    {/* Pulse ring effect */}
                    <div className="absolute inset-0 rounded-2xl bg-blue-500 opacity-0 group-hover:opacity-20 group-hover:scale-150 transition-all duration-500"></div>
                  </div>
                  <div>
                    <h1 className="text-xl font-display font-bold text-slate-800 dark:text-slate-100 tracking-tight">AppWhistler</h1>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold tracking-wider uppercase">Truth-Verified Apps</p>
                  </div>
                </div>

                {/* Navigation Menu */}
                <nav className="hidden md:flex items-center gap-6">
                  <a href="#apps" className="text-sm font-bold text-slate-700 dark:text-slate-300 hover:text-sky-600 dark:hover:text-sky-400 transition-colors">Apps</a>
                  <a href="#categories" className="text-sm font-bold text-slate-700 dark:text-slate-300 hover:text-sky-600 dark:hover:text-sky-400 transition-colors">Categories</a>
                  <a href="#leaderboard" className="text-sm font-bold text-slate-700 dark:text-slate-300 hover:text-sky-600 dark:hover:text-sky-400 transition-colors">Leaderboard</a>
                  <a href="#about" className="text-sm font-bold text-slate-700 dark:text-slate-300 hover:text-sky-600 dark:hover:text-sky-400 transition-colors">About</a>
                </nav>
              </div>

              <div className="flex items-center gap-3">
                {/* Mobile menu button */}
                <button
                  onClick={() => setShowNav(!showNav)}
                  className="md:hidden p-3 rounded-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm hover:scale-110 transition-all duration-300 shadow-lg"
                >
                  <span className="text-xl">{showNav ? '✕' : '☰'}</span>
                </button>

                {/* Dark mode toggle */}
                <button onClick={toggleDarkMode} className="p-3 rounded-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm hover:scale-110 transition-all duration-300 shadow-lg hover:shadow-xl">
                  <span className="text-2xl">{darkMode ? '☀️' : '🌙'}</span>
                </button>
              </div>
            </div>

            {/* Mobile navigation */}
            {showNav && (
              <nav className="md:hidden mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 flex flex-col gap-3">
                <a href="#apps" className="text-sm font-bold text-slate-700 dark:text-slate-300 hover:text-sky-600 dark:hover:text-sky-400 transition-colors py-2">Apps</a>
                <a href="#categories" className="text-sm font-bold text-slate-700 dark:text-slate-300 hover:text-sky-600 dark:hover:text-sky-400 transition-colors py-2">Categories</a>
                <a href="#leaderboard" className="text-sm font-bold text-slate-700 dark:text-slate-300 hover:text-sky-600 dark:hover:text-sky-400 transition-colors py-2">Leaderboard</a>
                <a href="#about" className="text-sm font-bold text-slate-700 dark:text-slate-300 hover:text-sky-600 dark:hover:text-sky-400 transition-colors py-2">About</a>
              </nav>
            )}
          </div>
        </header>

        <section className="max-w-7xl mx-auto px-6 py-16" id="apps">
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

          <div className="flex flex-wrap justify-center gap-3 mb-12" id="categories">
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

          {!loading && (
            <>
              <div className="text-center mb-8">
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                  Showing <span className="font-black text-sky-600 dark:text-sky-400 text-lg">{filteredApps.length}</span> of {apps.length} apps
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                <Suspense fallback={<AppCardSkeleton />}>
                  {filteredApps.map((app) => (
                    <AppCard
                      key={app.id}
                      app={app}
                      onClick={() => handleAppClick(app)}
                    />
                  ))}
                </Suspense>
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

        {/* App Detail Modal */}
        <AppDetailModal
          app={selectedApp}
          isOpen={showAppDetail}
          onClose={() => setShowAppDetail(false)}
          darkMode={darkMode}
        />
      </div>
    </div>
  );
}

export default App;
