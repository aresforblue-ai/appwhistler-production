import { useState, useEffect, lazy, Suspense } from 'react';
import AppCardSkeleton from './components/AppCardSkeleton';

// Lazy load AppCard component for code splitting
const AppCard = lazy(() => import('./components/AppCard'));

// Mock apps data with recognizable brands
const MOCK_APPS = [
  { id: 1, name: "Facebook", description: "Connect with friends and the world around you on Facebook", truthRating: 68, category: "social", isVerified: true, downloadCount: 2800000000, icon: "📘" },
  { id: 2, name: "Google", description: "Search the world's information including webpages, images, videos and more", truthRating: 92, category: "research", isVerified: true, downloadCount: 5000000000, icon: "🔍" },
  { id: 3, name: "Twitter", description: "Join the conversation and see what's happening in the world right now", truthRating: 64, category: "news", isVerified: true, downloadCount: 450000000, icon: "🐦" },
  { id: 4, name: "LinkedIn", description: "Connect with professionals, find jobs, and grow your career", truthRating: 88, category: "social", isVerified: true, downloadCount: 930000000, icon: "💼" },
  { id: 5, name: "WhatsApp", description: "Simple, reliable, private messaging and calling for free", truthRating: 85, category: "social", isVerified: true, downloadCount: 2000000000, icon: "💬" },
  { id: 6, name: "Instagram", description: "Create and share photos, stories, and reels with friends", truthRating: 71, category: "social", isVerified: true, downloadCount: 2000000000, icon: "📷" }
];

function App() {
  const [darkMode, setDarkMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const categories = ['all', 'news', 'research', 'verification', 'social', 'security'];
  const [apps] = useState(MOCK_APPS);
  const loading = false;

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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">

        <header className="sticky top-0 z-50 backdrop-blur-2xl bg-white/70 dark:bg-slate-950/70 border-b border-slate-200/50 dark:border-slate-800/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="flex items-center justify-between h-20">
              {/* Logo Section */}
              <div className="flex items-center gap-4">
                <div className="relative flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 via-cyan-500 to-blue-700 shadow-lg shadow-blue-500/30">
                  <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-xl font-display font-black text-slate-900 dark:text-white tracking-tight">AppWhistler</h1>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold tracking-wider uppercase">Truth-Verified Apps</p>
                </div>
              </div>

              {/* Desktop Navigation */}
              <nav className="hidden md:flex items-center gap-1">
                <button className="px-5 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-950/30 rounded-xl transition-all">
                  Explore
                </button>
                <button className="px-5 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-950/30 rounded-xl transition-all">
                  Leaderboard
                </button>
                <button className="px-5 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-950/30 rounded-xl transition-all">
                  Submit
                </button>
              </nav>

              {/* Right Actions */}
              <div className="flex items-center gap-3">
                <button onClick={toggleDarkMode} className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all duration-300 hover:scale-105 active:scale-95 touch-manipulation">
                  <span className="text-lg">{darkMode ? '☀️' : '🌙'}</span>
                </button>
              </div>
            </div>
          </div>
        </header>

        <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
          <div className="text-center mb-12 sm:mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-100 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-900 mb-6">
              <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="text-xs font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wide">Verified & Trusted</span>
            </div>

            <h2 className="text-5xl sm:text-6xl md:text-7xl font-display font-black mb-6 bg-gradient-to-r from-slate-900 via-blue-900 to-slate-900 dark:from-white dark:via-blue-200 dark:to-white bg-clip-text text-transparent tracking-tight leading-[1.1]">
              Truth-First App<br />Discovery
            </h2>
            <p className="text-lg sm:text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto mb-12 leading-relaxed">
              AI-powered app recommendations with built-in fact-checking to combat disinformation
            </p>

            <div className="flex items-center justify-center gap-8 sm:gap-12 mb-12">
              <div className="text-center">
                <div className="text-4xl sm:text-5xl font-black bg-gradient-to-br from-blue-600 to-cyan-500 bg-clip-text text-transparent">{apps.length}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-1">Verified Apps</div>
              </div>
              <div className="w-px h-14 bg-gradient-to-b from-transparent via-slate-300 dark:via-slate-700 to-transparent"></div>
              <div className="text-center">
                <div className="text-4xl sm:text-5xl font-black bg-gradient-to-br from-emerald-600 to-teal-500 bg-clip-text text-transparent">50/50</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-1">DAO Split</div>
              </div>
              <div className="w-px h-14 bg-gradient-to-b from-transparent via-slate-300 dark:via-slate-700 to-transparent"></div>
              <div className="text-center">
                <div className="text-4xl sm:text-5xl">🤖</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-1">AI Powered</div>
              </div>
            </div>
          </div>

          <div className="max-w-2xl mx-auto mb-10 px-4">
            <div className="relative">
              <svg className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search verified apps..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-14 pr-12 py-5 rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 focus:border-blue-500 dark:focus:border-blue-500 outline-none text-slate-900 dark:text-white placeholder-slate-400 text-lg font-medium shadow-xl shadow-slate-200/50 dark:shadow-slate-950/50 transition-all duration-300 focus:shadow-2xl focus:shadow-blue-500/20"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-5 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all">
                  <svg className="w-4 h-4 text-slate-600 dark:text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-3 mb-12 px-4">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-6 py-3 rounded-full text-sm font-bold transition-all duration-300 touch-manipulation ${
                  selectedCategory === cat
                    ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg shadow-blue-500/30'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-2 border-slate-200 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-lg'
                }`}
              >
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </button>
            ))}
          </div>

          {loading && (
            <div className="px-4">
              <div className="text-center mb-8">
                <div className="inline-block w-14 h-14 sm:w-16 sm:h-16 border-4 border-ice-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-fog-600 dark:text-fog-400 font-semibold text-base sm:text-lg">Loading truth-verified apps...</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {[...Array(6)].map((_, i) => <AppCardSkeleton key={i} />)}
              </div>
            </div>
          )}

          {!loading && (
            <>
              <div className="text-center mb-6 sm:mb-8 px-4">
                <p className="text-sm text-fog-500 dark:text-fog-400 font-medium">
                  Showing <span className="font-black text-ice-600 dark:text-ice-400 text-base sm:text-lg">{filteredApps.length}</span> of {apps.length} apps
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 px-4">
                <Suspense fallback={<AppCardSkeleton />}>
                  {filteredApps.map((app) => (
                    <AppCard key={app.id} app={app} />
                  ))}
                </Suspense>
              </div>

              {filteredApps.length === 0 && apps.length > 0 && (
                <div className="text-center py-16 sm:py-24 px-4">
                  <div className="text-6xl sm:text-8xl mb-6">🔍</div>
                  <h3 className="text-2xl sm:text-3xl font-bold text-fog-800 dark:text-fog-100 mb-3">No apps found</h3>
                  <p className="text-fog-600 dark:text-fog-400 mb-6 sm:mb-8 text-base sm:text-lg">Try adjusting your search or filters</p>
                  <button
                    onClick={() => { setSearchQuery(''); setSelectedCategory('all'); }}
                    className="px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-ice-500 to-ice-600 text-white rounded-xl font-bold hover:scale-105 active:scale-95 transition-transform shadow-lg touch-manipulation"
                  >
                    Clear Filters
                  </button>
                </div>
              )}
            </>
          )}
        </section>

        <footer className="border-t border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur-2xl mt-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <span className="text-lg font-display font-black text-slate-900 dark:text-white">AppWhistler</span>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">Built with ❤️ to combat disinformation</p>
            <p className="text-xs text-slate-500 dark:text-slate-500 font-semibold">Powered by Grok AI • Truth DAO • Ethereum</p>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default App;
