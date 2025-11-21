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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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
      <div className="min-h-screen bg-gradient-to-br from-ice-50 via-white via-40% to-fog-100 dark:from-fog-950 dark:via-fog-900 dark:to-fog-800 animate-gradient">
        
        <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/80 dark:bg-fog-900/80 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="flex items-center justify-between h-16">
              {/* Logo Section */}
              <div className="flex items-center gap-3">
                <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-ice-400 via-ice-500 to-ice-600 flex items-center justify-center shadow-lg shadow-ice-500/30 hover:shadow-ice-500/50 transition-all duration-300 hover:scale-105">
                  <span className="text-xl">🛡️</span>
                  <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-emerald-400 rounded-full flex items-center justify-center text-[8px] shadow-md">✓</div>
                </div>
                <div>
                  <h1 className="text-lg font-display font-bold text-fog-800 dark:text-fog-50 tracking-tight">AppWhistler</h1>
                  <p className="text-[9px] text-fog-500 dark:text-fog-400 font-semibold tracking-wider uppercase">Truth-Verified</p>
                </div>
              </div>

              {/* Desktop Navigation */}
              <nav className="hidden md:flex items-center gap-2">
                <button className="px-4 py-2 text-sm font-semibold text-fog-700 dark:text-fog-300 hover:text-ice-600 dark:hover:text-ice-400 hover:bg-ice-50 dark:hover:bg-ice-900/20 rounded-lg transition-all">
                  Explore
                </button>
                <button className="px-4 py-2 text-sm font-semibold text-fog-700 dark:text-fog-300 hover:text-ice-600 dark:hover:text-ice-400 hover:bg-ice-50 dark:hover:bg-ice-900/20 rounded-lg transition-all">
                  Leaderboard
                </button>
                <button className="px-4 py-2 text-sm font-semibold text-fog-700 dark:text-fog-300 hover:text-ice-600 dark:hover:text-ice-400 hover:bg-ice-50 dark:hover:bg-ice-900/20 rounded-lg transition-all">
                  Submit App
                </button>
                <button className="px-4 py-2 text-sm font-semibold text-fog-700 dark:text-fog-300 hover:text-ice-600 dark:hover:text-ice-400 hover:bg-ice-50 dark:hover:bg-ice-900/20 rounded-lg transition-all">
                  About
                </button>
              </nav>

              {/* Right Actions */}
              <div className="flex items-center gap-2">
                <button onClick={toggleDarkMode} className="p-2.5 rounded-lg bg-fog-100 dark:bg-fog-800 hover:bg-fog-200 dark:hover:bg-fog-700 transition-all duration-300 hover:scale-105 active:scale-95 touch-manipulation">
                  <span className="text-xl">{darkMode ? '☀️' : '🌙'}</span>
                </button>

                {/* Mobile Menu Button */}
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="md:hidden p-2.5 rounded-lg bg-fog-100 dark:bg-fog-800 hover:bg-fog-200 dark:hover:bg-fog-700 transition-all touch-manipulation active:scale-95"
                >
                  <span className="text-xl">{mobileMenuOpen ? '✕' : '☰'}</span>
                </button>
              </div>
            </div>

            {/* Mobile Navigation Menu */}
            {mobileMenuOpen && (
              <div className="md:hidden py-4 border-t border-fog-200 dark:border-fog-700 bg-white/95 dark:bg-fog-900/95 backdrop-blur-xl">
                <nav className="flex flex-col gap-2">
                  <button className="px-4 py-3 text-left text-sm font-semibold text-fog-700 dark:text-fog-300 hover:text-ice-600 dark:hover:text-ice-400 hover:bg-ice-50 dark:hover:bg-ice-900/20 rounded-lg transition-all active:scale-98 touch-manipulation">
                    Explore Apps
                  </button>
                  <button className="px-4 py-3 text-left text-sm font-semibold text-fog-700 dark:text-fog-300 hover:text-ice-600 dark:hover:text-ice-400 hover:bg-ice-50 dark:hover:bg-ice-900/20 rounded-lg transition-all active:scale-98 touch-manipulation">
                    Leaderboard
                  </button>
                  <button className="px-4 py-3 text-left text-sm font-semibold text-fog-700 dark:text-fog-300 hover:text-ice-600 dark:hover:text-ice-400 hover:bg-ice-50 dark:hover:bg-ice-900/20 rounded-lg transition-all active:scale-98 touch-manipulation">
                    Submit App
                  </button>
                  <button className="px-4 py-3 text-left text-sm font-semibold text-fog-700 dark:text-fog-300 hover:text-ice-600 dark:hover:text-ice-400 hover:bg-ice-50 dark:hover:bg-ice-900/20 rounded-lg transition-all active:scale-98 touch-manipulation">
                    About
                  </button>
                  <div className="h-px bg-fog-200 dark:bg-fog-700 my-2"></div>
                  <button className="px-4 py-3 text-left text-sm font-bold text-white bg-gradient-to-r from-ice-500 to-ice-600 hover:from-ice-600 hover:to-ice-700 rounded-lg transition-all active:scale-98 touch-manipulation shadow-md">
                    Sign In
                  </button>
                </nav>
              </div>
            )}
          </div>
        </header>

        <section className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
          <div className="text-center mb-10 sm:mb-12">
            <h2 className="text-4xl sm:text-5xl md:text-6xl font-display font-black mb-4 sm:mb-6 bg-gradient-to-r from-ice-600 via-ice-500 to-ice-400 bg-clip-text text-transparent tracking-tight leading-tight">
              Truth-First Discovery
            </h2>
            <p className="text-lg sm:text-xl text-fog-600 dark:text-fog-300 max-w-2xl mx-auto mb-8 sm:mb-10 font-medium leading-relaxed px-4">
              AI-powered app recommendations with built-in fact-checking to combat disinformation
            </p>

            <div className="flex items-center justify-center gap-6 sm:gap-10 mb-8 sm:mb-10">
              <div className="text-center group cursor-pointer touch-manipulation">
                <div className="text-3xl sm:text-4xl font-black bg-gradient-to-r from-ice-600 to-ice-500 bg-clip-text text-transparent group-hover:scale-110 group-active:scale-95 transition-transform">{apps.length}</div>
                <div className="text-[10px] sm:text-xs text-fog-500 dark:text-fog-400 font-bold uppercase tracking-wider">Verified</div>
              </div>
              <div className="w-px h-10 sm:h-12 bg-gradient-to-b from-transparent via-fog-300 dark:via-fog-700 to-transparent"></div>
              <div className="text-center group cursor-pointer touch-manipulation">
                <div className="text-3xl sm:text-4xl font-black bg-gradient-to-r from-emerald-500 to-emerald-400 bg-clip-text text-transparent group-hover:scale-110 group-active:scale-95 transition-transform">50/50</div>
                <div className="text-[10px] sm:text-xs text-fog-500 dark:text-fog-400 font-bold uppercase tracking-wider">DAO Split</div>
              </div>
              <div className="w-px h-10 sm:h-12 bg-gradient-to-b from-transparent via-fog-300 dark:via-fog-700 to-transparent"></div>
              <div className="text-center group cursor-pointer touch-manipulation">
                <div className="text-3xl sm:text-4xl animate-bounce">🤖</div>
                <div className="text-[10px] sm:text-xs text-fog-500 dark:text-fog-400 font-bold uppercase tracking-wider">AI Powered</div>
              </div>
            </div>
          </div>

          <div className="max-w-2xl mx-auto mb-8 sm:mb-10 px-4">
            <div className="relative group">
              <input
                type="text"
                placeholder="Search truth-verified apps..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-5 py-4 pl-12 rounded-xl bg-white/95 dark:bg-fog-900/95 backdrop-blur-xl border-2 border-fog-200 dark:border-fog-700 focus:border-ice-500 dark:focus:border-ice-400 outline-none text-fog-800 dark:text-fog-100 placeholder-fog-400 text-base sm:text-lg font-medium shadow-lg transition-all duration-300 focus:shadow-xl focus:scale-[1.01] touch-manipulation"
              />
              <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-xl sm:text-2xl group-focus-within:scale-110 transition-transform">🔍</div>
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 transform -translate-y-1/2 text-fog-400 hover:text-fog-600 dark:hover:text-fog-300 text-lg sm:text-xl font-bold hover:scale-110 active:scale-95 transition-all touch-manipulation">
                  ✕
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-2 sm:gap-3 mb-10 sm:mb-12 px-4">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 sm:px-6 py-2.5 sm:py-3 rounded-full text-xs sm:text-sm font-bold transition-all duration-300 touch-manipulation active:scale-95 ${
                  selectedCategory === cat
                    ? 'bg-gradient-to-r from-ice-500 to-ice-600 text-white shadow-lg shadow-ice-500/30 scale-105'
                    : 'bg-white/95 dark:bg-fog-800/95 text-fog-600 dark:text-fog-300 border-2 border-fog-200 dark:border-fog-700 hover:border-ice-400 dark:hover:border-ice-500 hover:scale-105 backdrop-blur-sm'
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

        <footer className="border-t border-fog-200 dark:border-fog-800 bg-white/60 dark:bg-fog-900/60 backdrop-blur-xl mt-16 sm:mt-24 shadow-lg">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 text-center">
            <p className="text-sm text-fog-600 dark:text-fog-400 mb-2 font-medium">Built with ❤️ to combat disinformation</p>
            <p className="text-xs text-fog-500 dark:text-fog-500 font-semibold">Powered by Grok AI • Truth DAO • Ethereum</p>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default App;
