// src/frontend/App.jsx
// Main React application for AppWhistler
// Minimalist design with greys, blues, and whites + dark mode

import React, { useState, useEffect } from 'react';
import './App.css'; // Tailwind CSS imported here

const HERO_FEATURES = [
  'Realtime disinformation radar',
  'AI-vetted developer reputation',
  'Fact-check routing in under 90s'
];

const DISCOVER_METRICS = [
  { label: 'Apps Rated', value: '1,842', delta: '+186 this week' },
  { label: 'Fact Checks', value: '638', delta: '92% accuracy' },
  { label: 'Chain Proofs', value: '312', delta: 'On Goerli network' }
];

const FILTER_OPTIONS = ['All', 'Social', 'Productivity', 'Finance', 'Health', 'Civic'];

const DEFAULT_FACT_CHECKS = [
  {
    id: 'fc-01',
    claim: 'App X removes negative reviews in 24h',
    verdict: 'MISLEADING',
    explanation: 'Moderation prioritizes recent reports but does not delete verified reviews.',
    source: 'Mozilla Observatory'
  },
  {
    id: 'fc-02',
    claim: 'App Y shares contacts with advertisers',
    verdict: 'TRUE',
    explanation: 'Network traces confirmed hashed contact syncing that powers lookalike ads.',
    source: 'EFF Research'
  },
  {
    id: 'fc-03',
    claim: 'Government backed every “GreenScore” badge',
    verdict: 'FALSE',
    explanation: 'Badges are issued by an unregistered marketing vendor with no public audits.',
    source: 'AppWhistler Labs'
  }
];

const PROFILE_BADGES = [
  { label: 'Signal Booster', color: 'from-emerald-400 to-teal-500' },
  { label: 'Truth Scout', color: 'from-blue-400 to-indigo-500' },
  { label: 'Chain Ally', color: 'from-amber-400 to-orange-500' }
];

/**
 * Main App Component
 * Features: Dark mode, app search, fact-checking, personalized feed
 */
function App() {
  // State management
  const [darkMode, setDarkMode] = useState(false);
  const [user, setUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [apps, setApps] = useState([]);
  const [factChecks, setFactChecks] = useState([]);
  const [activeTab, setActiveTab] = useState('discover'); // discover, factcheck, profile
  const [activeFilter, setActiveFilter] = useState('All');

  // Load user and preferences from localStorage
  useEffect(() => {
    const savedUser = localStorage.getItem('appwhistler_user');
    const savedDarkMode = localStorage.getItem('appwhistler_darkmode');
    
    if (savedUser) setUser(JSON.parse(savedUser));
    if (savedDarkMode) setDarkMode(savedDarkMode === 'true');
  }, []);

  // Apply dark mode class to body
  useEffect(() => {
    if (darkMode) {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
    localStorage.setItem('appwhistler_darkmode', darkMode);
  }, [darkMode]);

  // Fetch apps from backend
  const searchApps = async (query) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/v1/apps/trending?search=${query}`);
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      if (data.success) {
        setApps(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch apps:', error);
    }
  };

  // Handle search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.length >= 2) {
        searchApps(searchQuery);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const filteredApps = activeFilter === 'All'
    ? apps
    : apps.filter(app => (app.category || '').toLowerCase().includes(activeFilter.toLowerCase()));

  return (
    <div className={`relative min-h-screen overflow-hidden ${darkMode ? 'bg-slate-950' : 'bg-slate-50'} transition-colors duration-500`}>
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 -right-16 h-72 w-72 rounded-full bg-blue-500/20 blur-3xl" />
        <div className="absolute top-1/3 -left-16 h-64 w-64 rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 h-80 w-80 rounded-full bg-cyan-500/10 blur-3xl" />
      </div>

      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <Header 
          darkMode={darkMode} 
          setDarkMode={setDarkMode} 
          user={user}
          setUser={setUser}
        />

        <HeroSection 
          darkMode={darkMode}
          user={user}
          factChecks={factChecks.length || DEFAULT_FACT_CHECKS.length}
        />

        {/* Navigation Tabs */}
        <Navigation 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
          darkMode={darkMode}
        />

        {/* Main Content */}
        <main className="container mx-auto px-4 py-10 w-full max-w-6xl flex-1">
          {activeTab === 'discover' && (
            <DiscoverTab 
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              apps={filteredApps}
              fullApps={apps}
              darkMode={darkMode}
              activeFilter={activeFilter}
              setActiveFilter={setActiveFilter}
            />
          )}

          {activeTab === 'factcheck' && (
            <FactCheckTab 
              factChecks={factChecks}
              darkMode={darkMode}
            />
          )}

          {activeTab === 'profile' && (
            <ProfileTab 
              user={user}
              darkMode={darkMode}
            />
          )}
        </main>

        {/* Footer */}
        <Footer darkMode={darkMode} />
      </div>
    </div>
  );
}

/**
 * Header Component
 * Logo, user info, dark mode toggle
 */
function Header({ darkMode, setDarkMode, user, setUser }) {
  const [showAuthModal, setShowAuthModal] = useState(false);

  return (
    <header className={`${darkMode ? 'bg-slate-950/70 border-white/10' : 'bg-white/70 border-slate-200'} backdrop-blur-xl border-b transition-colors`}>
      <div className="container mx-auto px-4 py-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between max-w-6xl">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-600 text-white font-bold flex items-center justify-center shadow-lg shadow-blue-500/30">
            AW
          </div>
          <div>
            <h1 className={`text-2xl font-semibold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              AppWhistler
            </h1>
            <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Integrity intelligence for the app stores
            </p>
          </div>
          <span className="ml-3 px-3 py-1 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            LIVE TRUST FEED
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setDarkMode(!darkMode)}
            className={`group flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-medium border transition ${
              darkMode
                ? 'border-slate-700 text-slate-200 hover:border-blue-500'
                : 'border-slate-200 text-slate-700 hover:border-blue-500'
            }`}
            aria-label="Toggle dark mode"
          >
            <span className="text-lg">{darkMode ? '☀️' : '🌙'}</span>
            {darkMode ? 'Daybreak' : 'Nightwatch'}
          </button>

          {user ? (
            <div className={`flex items-center gap-3 rounded-2xl border px-4 py-2 ${
              darkMode ? 'border-blue-500/40 bg-blue-500/10' : 'border-blue-200 bg-blue-50'
            }`}>
              <div>
                <p className={`text-sm font-semibold ${darkMode ? 'text-blue-200' : 'text-blue-800'}`}>{user.username}</p>
                <p className={`text-xs ${darkMode ? 'text-blue-100' : 'text-blue-600'}`}>Truth Score {user.truthScore}</p>
              </div>
              <button
                onClick={() => {
                  localStorage.removeItem('appwhistler_user');
                  setUser(null);
                }}
                className={`text-xs font-semibold ${darkMode ? 'text-rose-300 hover:text-rose-200' : 'text-rose-500 hover:text-rose-600'}`}
              >
                Logout
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowAuthModal(true)}
              className="rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-500 px-6 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-500/30"
            >
              Sign In
            </button>
          )}
        </div>
      </div>

      {/* Auth Modal (simplified) */}
      {showAuthModal && (
        <AuthModal 
          onClose={() => setShowAuthModal(false)} 
          setUser={setUser}
          darkMode={darkMode}
        />
      )}
    </header>
  );
}

/**
 * Navigation Tabs Component
 */
function Navigation({ activeTab, setActiveTab, darkMode }) {
  const tabs = [
    { id: 'discover', label: 'Discover', icon: '🔍', helper: 'Signal radar' },
    { id: 'factcheck', label: 'Fact Checks', icon: '✓', helper: 'Rapid review' },
    { id: 'profile', label: 'Profile', icon: '👤', helper: 'Analyst mode' }
  ];

  return (
    <nav className={`${darkMode ? 'bg-slate-950/60 border-white/5' : 'bg-white/70 border-slate-200'} border-b backdrop-blur-xl`}>
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="flex flex-wrap gap-3 py-4">
          {tabs.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col rounded-2xl border px-5 py-3 text-left transition ${
                  isActive
                    ? 'border-blue-500/70 bg-blue-500/10 shadow-lg shadow-blue-500/20'
                    : darkMode
                      ? 'border-slate-800 bg-slate-900/40 hover:border-slate-600'
                      : 'border-slate-200 bg-white hover:border-slate-400'
                }`}
              >
                <span className="text-base font-semibold flex items-center gap-2">
                  <span>{tab.icon}</span>
                  {tab.label}
                </span>
                <span className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  {tab.helper}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

function HeroSection({ darkMode, user, factChecks }) {
  return (
    <section className="container mx-auto px-4 max-w-6xl w-full mt-6">
      <div className={`relative overflow-hidden rounded-3xl border ${
        darkMode ? 'border-white/10 bg-slate-950/70' : 'border-slate-200 bg-white/90'
      }`}>
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/15 via-transparent to-cyan-400/30" />
        <div className="absolute -top-16 right-32 h-48 w-48 rounded-full bg-blue-500/30 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-32 w-32 rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="relative z-10 grid gap-10 p-8 lg:grid-cols-2">
          <div>
            <p className="text-sm font-semibold tracking-[0.35em] text-blue-400">TRUTH OPS</p>
            <h2 className={`mt-3 text-3xl font-semibold leading-tight lg:text-4xl ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              Every install deserves <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">auditable trust</span>
            </h2>
            <p className={`mt-4 text-base ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
              AppWhistler triangulates on-chain attestations, researcher fact checks, and user telemetry to downgrade risky builds before they trend.
            </p>
            <div className="mt-6 flex flex-wrap gap-4">
              <button className="rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/30">
                Launch Integrity Scan
              </button>
              <button className={`rounded-2xl px-6 py-3 text-sm font-semibold ${
                darkMode ? 'border border-slate-700 text-white hover:border-blue-400' : 'border border-slate-200 text-slate-900 hover:border-blue-400'
              }`}>
                View Trust Playbook
              </button>
            </div>
            <ul className="mt-6 grid gap-3 sm:grid-cols-2">
              {HERO_FEATURES.map(feature => (
                <li key={feature} className="flex items-start gap-3 text-sm">
                  <span className="mt-0.5 text-emerald-400">●</span>
                  <span className={darkMode ? 'text-slate-200' : 'text-slate-700'}>{feature}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="grid gap-4">
            <div className={`${darkMode ? 'bg-slate-900/70 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'} rounded-2xl border p-5 shadow-xl shadow-blue-500/10`}>
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-blue-400">Signal Health Monitor</p>
                <span className="text-xs uppercase tracking-wide text-slate-400">Realtime</span>
              </div>
              <p className="mt-4 text-4xl font-bold">91%</p>
              <p className="text-sm text-slate-400">of submissions pass baseline trust heuristics</p>
              <div className={`mt-4 h-2 w-full rounded-full ${darkMode ? 'bg-slate-800' : 'bg-slate-200'}`}>
                <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400" style={{ width: '91%' }} />
              </div>
            </div>
            <div className={`${darkMode ? 'bg-gradient-to-br from-indigo-600/40 to-blue-500/30 text-white border-white/10' : 'bg-gradient-to-br from-indigo-100 to-blue-100 text-slate-900 border-blue-100/50'} rounded-2xl border p-5`}>
              <p className="text-sm font-semibold">Fact checks verified</p>
              <p className="mt-2 text-5xl font-bold">{factChecks}</p>
              <p className="text-sm opacity-80">Streaming to every client workspace</p>
              <div className="mt-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center text-lg">⚡</div>
                <div>
                  <p className="text-xs uppercase tracking-widest opacity-70">Analyst Mode</p>
                  <p className="text-sm font-semibold">{user ? 'Synced with your feed' : 'Sign in for tailored alerts'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * Discover Tab - App Search & Recommendations
 */
function DiscoverTab({
  searchQuery,
  setSearchQuery,
  apps,
  fullApps,
  darkMode,
  activeFilter,
  setActiveFilter
}) {
  const hasResults = apps.length > 0;
  const benchmarks = fullApps.length ? fullApps : apps;
  const updatedAt = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="space-y-8">
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {DISCOVER_METRICS.map(metric => (
          <MetricCard key={metric.label} metric={metric} darkMode={darkMode} />
        ))}
      </section>

      <section className={`${darkMode ? 'bg-slate-950/70 border-white/10' : 'bg-white border-slate-200'} rounded-3xl border p-6 shadow-xl shadow-blue-500/5`}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-xl text-slate-400">🔍</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by app, dev, or signal keyword..."
              className={`w-full rounded-2xl border px-12 py-3 text-sm font-medium ${
                darkMode
                  ? 'border-slate-800 bg-slate-900 text-white placeholder-slate-500'
                  : 'border-slate-200 bg-white text-slate-900 placeholder-slate-400'
              } focus:outline-none focus:ring-2 focus:ring-blue-500/60`}
            />
          </div>
          <button className="rounded-2xl bg-gradient-to-r from-blue-500 to-cyan-400 px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/30">
            Pulse Search
          </button>
        </div>
        <FilterPills 
          options={FILTER_OPTIONS} 
          active={activeFilter} 
          onChange={setActiveFilter}
          darkMode={darkMode}
        />
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
          <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Trending integrity signals</p>
          <h3 className={`text-2xl font-semibold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            {hasResults ? 'Precision-ranked apps' : 'Ready when you are'}
          </h3>
        </div>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {hasResults ? (
            apps.map((app, idx) => <AppCard key={app.id || app.name || idx} app={app} darkMode={darkMode} />)
          ) : (
            <EmptyState darkMode={darkMode} query={searchQuery} />
          )}
        </div>
      </section>

      {benchmarks.length > 0 && (
        <section className={`${darkMode ? 'bg-slate-950/60 border-white/5' : 'bg-white border-slate-200'} rounded-3xl border p-6`}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm text-blue-400">Anomalies board</p>
              <h4 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                Radar feed (top {Math.min(benchmarks.length, 5)})
              </h4>
            </div>
            <button className="text-sm font-semibold text-blue-400 hover:text-blue-300">Export CSV</button>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {benchmarks.slice(0, 5).map(app => (
              <div key={`mini-${app.id || app.name}`} className={`${darkMode ? 'bg-slate-900/60' : 'bg-slate-50'} rounded-2xl p-4`}> 
                <p className="text-sm font-semibold truncate">{app.name}</p>
                <p className="text-xs text-slate-400">{app.developer || 'Unknown dev'}</p>
                <p className="mt-2 text-lg font-bold text-blue-400">{app.truth_rating?.toFixed(1) || '—'}</p>
                <p className="text-xs text-slate-500">{(app.download_count || 0).toLocaleString()} installs</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

/**
 * App Card Component
 */
function AppCard({ app, darkMode }) {
  const trustScore = app.truth_rating?.toFixed(1) || '—';
  const confidence = Math.min(100, Math.round(((app.truth_rating || 0) / 5) * 100));
  const category = (app.category || 'General').replace(/\b\w/g, char => char.toUpperCase());

  return (
    <div className="group relative rounded-3xl bg-gradient-to-br from-slate-200/40 via-transparent to-blue-500/40 p-[1px] shadow-lg shadow-slate-900/10">
      <div className={`${darkMode ? 'bg-slate-950/90' : 'bg-white'} rounded-3xl p-6 h-full flex flex-col gap-4 border ${darkMode ? 'border-white/5' : 'border-slate-100'}`}>
        <div className="flex items-start gap-4">
          <img
            src={app.icon_url || '/placeholder-icon.png'}
            alt={app.name}
            className="h-16 w-16 rounded-2xl object-cover border border-white/20"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className={`truncate text-lg font-semibold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                {app.name}
              </h3>
              <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-xs text-blue-400">
                {category}
              </span>
            </div>
            <p className={`truncate text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              {app.developer || 'Unknown developer'}
            </p>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between text-xs uppercase tracking-widest text-slate-400">
            <span>Truth Rating</span>
            <span>{trustScore}/5.0</span>
          </div>
          <div className={`mt-2 h-2 w-full rounded-full ${darkMode ? 'bg-slate-800' : 'bg-slate-200'}`}>
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-500"
              style={{ width: `${confidence}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className={`${darkMode ? 'bg-slate-900/60' : 'bg-slate-50'} rounded-2xl p-3`}>
            <p className="text-xs text-slate-400">Downloads</p>
            <p className="text-lg font-semibold">{(app.download_count || 0).toLocaleString()}</p>
          </div>
          <div className={`${darkMode ? 'bg-slate-900/60' : 'bg-slate-50'} rounded-2xl p-3`}>
            <p className="text-xs text-slate-400">Last audit</p>
            <p className="text-lg font-semibold">{app.last_audit || '24h ago'}</p>
          </div>
        </div>

        <div className="mt-auto flex items-center justify-between text-sm">
          <p className="text-slate-400">Chain proofs</p>
          <p className="font-semibold text-emerald-300">{app.chain_proofs || 'Goerli'}</p>
        </div>

        <button className="rounded-2xl border border-blue-500/40 bg-blue-500/10 px-4 py-2 text-sm font-semibold text-blue-300 transition group-hover:border-blue-400 group-hover:text-white group-hover:bg-blue-500/50">
          View dossier →
        </button>
      </div>
    </div>
  );
}

function MetricCard({ metric, darkMode }) {
  return (
    <div className={`${darkMode ? 'bg-slate-950/70 border-white/10' : 'bg-white border-slate-200'} rounded-3xl border p-5 shadow-lg shadow-blue-500/10`}>
      <p className="text-sm text-slate-400">{metric.label}</p>
      <p className="mt-2 text-3xl font-semibold text-blue-400">{metric.value}</p>
      <p className="text-xs text-emerald-400">{metric.delta}</p>
    </div>
  );
}

function FilterPills({ options, active, onChange, darkMode }) {
  return (
    <div className="mt-4 flex flex-wrap gap-3">
      {options.map(option => {
        const isActive = option === active;
        return (
          <button
            key={option}
            onClick={() => onChange(option)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              isActive
                ? 'bg-blue-500/20 text-blue-300 border border-blue-400/60'
                : darkMode
                  ? 'bg-slate-900/70 text-slate-300 border border-slate-800 hover:border-slate-600'
                  : 'bg-slate-50 text-slate-600 border border-slate-200 hover:border-slate-400'
            }`}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}

function EmptyState({ darkMode, query }) {
  return (
    <div className={`col-span-full rounded-3xl border py-12 text-center ${
      darkMode ? 'border-white/5 bg-slate-950/70 text-slate-400' : 'border-slate-200 bg-white text-slate-500'
    }`}>
      <p className="text-lg font-semibold">{query ? 'No apps match that signature yet' : 'Start searching for apps...'}</p>
      <p className="mt-2 text-sm">We will auto-populate as soon as telemetry arrives.</p>
    </div>
  );
}

/**
 * Fact Check Tab - NewsTruth Module
 */
function FactCheckTab({ factChecks, darkMode }) {
  const [newClaim, setNewClaim] = useState('');
  const feed = factChecks.length ? factChecks : DEFAULT_FACT_CHECKS;

  const submitClaim = async () => {
    console.log('Submitting claim:', newClaim);
  };

  return (
    <div className="grid gap-8 lg:grid-cols-3">
      <div className={`lg:col-span-2 rounded-3xl border p-6 ${darkMode ? 'border-white/10 bg-slate-950/70' : 'border-slate-200 bg-white'}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-blue-400">Submit a claim</p>
            <h2 className={`text-2xl font-semibold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Dispatch to NewsTruth desk</h2>
          </div>
          <span className="rounded-full border border-emerald-400/50 px-3 py-1 text-xs font-semibold text-emerald-300">Avg turnaround 14m</span>
        </div>
        <textarea
          value={newClaim}
          onChange={(e) => setNewClaim(e.target.value)}
          placeholder="e.g. 'GreenScore badges are government certified'"
          className={`mt-6 w-full rounded-3xl border px-5 py-4 text-sm ${
            darkMode ? 'border-slate-800 bg-slate-900 text-white' : 'border-slate-200 bg-slate-50 text-slate-900'
          } focus:outline-none focus:ring-2 focus:ring-blue-500/50`}
          rows={4}
        />
        <div className="mt-4 flex items-center justify-between">
          <p className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>Use clear, attributable language for faster routing.</p>
          <button 
            onClick={submitClaim}
            className="rounded-2xl bg-gradient-to-r from-emerald-400 to-blue-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-400/30"
          >
            Verify Claim
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {feed.map((fc, index) => (
          <FactCheckCard key={fc.id || index} factCheck={fc} darkMode={darkMode} index={index} />
        ))}
      </div>
    </div>
  );
}

/**
 * Fact Check Card Component
 */
function FactCheckCard({ factCheck, darkMode, index }) {
  const verdictColors = {
    TRUE: 'from-emerald-400 to-green-500 text-white',
    FALSE: 'from-rose-500 to-red-600 text-white',
    MISLEADING: 'from-amber-400 to-orange-500 text-white',
    UNVERIFIED: 'from-slate-400 to-slate-500 text-white'
  };

  return (
    <div className="relative pl-8">
      <div className="absolute left-3 top-0 h-full w-px bg-gradient-to-b from-blue-400/60 via-transparent to-transparent" />
      <div className="absolute left-0 top-2 h-4 w-4 rounded-full bg-blue-400 shadow-lg shadow-blue-400/40" />
      <div className={`${darkMode ? 'bg-slate-950/70 border-white/10' : 'bg-white border-slate-200'} rounded-2xl border p-5 shadow-md`}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs text-slate-400">Case #{index + 1}</p>
            <h3 className={`text-base font-semibold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{factCheck.claim}</h3>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold bg-gradient-to-r ${verdictColors[factCheck.verdict] || verdictColors.UNVERIFIED}`}>
            {factCheck.verdict || 'UNVERIFIED'}
          </span>
        </div>
        <p className={`mt-3 text-sm ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>{factCheck.explanation}</p>
        <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
          <span>Source · {factCheck.source || 'Undisclosed'}</span>
          <span>Updated {factCheck.updated_at || 'moments ago'}</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Profile Tab - User Info & Stats
 */
function ProfileTab({ user, darkMode }) {
  if (!user) {
    return (
      <div className={`${darkMode ? 'bg-slate-950/70 border-white/10' : 'bg-white border-slate-200'} rounded-3xl border p-10 text-center`}>
        <p className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Analyst workspace locked</p>
        <p className={`mt-2 text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
          Sign in to sync truth scores, badge history, and alert routes.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className={`${darkMode ? 'bg-slate-950/80 border-white/10' : 'bg-white border-slate-200'} rounded-3xl border p-6`}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-blue-400">Analyst Profile</p>
            <h2 className={`text-2xl font-semibold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{user.username}</h2>
            <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Truth Score {user.truthScore}</p>
          </div>
          <button className="rounded-2xl border border-blue-500/40 px-4 py-2 text-sm font-semibold text-blue-300">Manage alerts</button>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <ProfileStatCard darkMode={darkMode} label="Signals triaged" value="382" hint="last 30d" />
          <ProfileStatCard darkMode={darkMode} label="Escalations blocked" value="27" hint="critical" />
          <ProfileStatCard darkMode={darkMode} label="Accuracy streak" value="98.4%" hint="verified" />
          <ProfileStatCard darkMode={darkMode} label="Chain attestations" value="44" hint="multi-chain" />
        </div>
      </section>

      <section className={`${darkMode ? 'bg-slate-950/70 border-white/5' : 'bg-white border-slate-200'} rounded-3xl border p-6`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-blue-400">Badges</p>
            <h3 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Reputation graph</h3>
          </div>
          <button className="text-sm font-semibold text-blue-400">View history</button>
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          {PROFILE_BADGES.map(badge => (
            <span key={badge.label} className={`rounded-2xl bg-gradient-to-r ${badge.color} px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-slate-900/20`}>
              {badge.label}
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}

function ProfileStatCard({ label, value, hint, darkMode }) {
  return (
    <div className={`rounded-2xl border p-4 ${
      darkMode
        ? 'border-white/10 bg-white/5 text-white'
        : 'border-slate-200 bg-white text-slate-900'
    }`}>
      <p className="text-xs uppercase tracking-widest text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
      <p className="text-xs text-slate-400">{hint}</p>
    </div>
  );
}
/**
 * Simple Auth Modal (placeholder)
 */
function AuthModal({ onClose, setUser, darkMode }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    // Simulate login
    setUser({ username: 'demo_user', truthScore: 150 });
    localStorage.setItem('appwhistler_user', JSON.stringify({ username: 'demo_user', truthScore: 150 }));
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur">
      <div className={`${darkMode ? 'bg-slate-950/90 border-white/10' : 'bg-white border-slate-200'} relative w-full max-w-md rounded-3xl border p-8 shadow-2xl`}>
        <div className="absolute -top-6 right-6 h-16 w-16 rounded-full bg-blue-500/30 blur-2xl" />
        <h2 className={`text-2xl font-semibold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Sign In</h2>
        <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Unlock analyst-only dashboards.</p>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          className={`mt-6 w-full rounded-2xl border px-4 py-3 text-sm ${
            darkMode ? 'border-slate-800 bg-slate-900 text-white' : 'border-slate-200 bg-slate-50 text-slate-900'
          } focus:outline-none focus:ring-2 focus:ring-blue-500/60`}
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className={`mt-3 w-full rounded-2xl border px-4 py-3 text-sm ${
            darkMode ? 'border-slate-800 bg-slate-900 text-white' : 'border-slate-200 bg-slate-50 text-slate-900'
          } focus:outline-none focus:ring-2 focus:ring-blue-500/60`}
        />
        <div className="mt-6 flex gap-3">
          <button
            onClick={handleLogin}
            className="flex-1 rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-500 px-4 py-3 text-sm font-semibold text-white"
          >
            Login
          </button>
          <button
            onClick={onClose}
            className={`flex-1 rounded-2xl border px-4 py-3 text-sm font-semibold ${
              darkMode ? 'border-slate-700 text-slate-300' : 'border-slate-200 text-slate-700'
            }`}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Footer Component
 */
function Footer({ darkMode }) {
  return (
    <footer className={`${darkMode ? 'bg-slate-950/70 border-white/5' : 'bg-white border-slate-200'} border-t mt-12 backdrop-blur`}>
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Community-owned trust infrastructure</p>
          </div>
          <div className="flex flex-wrap gap-4 text-sm font-semibold text-blue-400">
            <a href="https://github.com/appwhistler/appwhistler" target="_blank" rel="noopener noreferrer">GitHub</a>
            <a href="#">Donate</a>
            <a href="#">About</a>
            <a href="#">Status</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
