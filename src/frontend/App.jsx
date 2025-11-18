// src/frontend/App.jsx
// Main React application for AppWhistler
// Minimalist design with greys, blues, and whites + dark mode

import React, { useState, useEffect } from 'react';
import './App.css'; // Tailwind CSS imported here

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

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gray-50'} transition-colors duration-200`}>
      {/* Header */}
      <Header 
        darkMode={darkMode} 
        setDarkMode={setDarkMode} 
        user={user}
        setUser={setUser}
      />

      {/* Navigation Tabs */}
      <Navigation 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        darkMode={darkMode}
      />

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        {activeTab === 'discover' && (
          <DiscoverTab 
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            apps={apps}
            darkMode={darkMode}
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
  );
}

/**
 * Header Component
 * Logo, user info, dark mode toggle
 */
function Header({ darkMode, setDarkMode, user, setUser }) {
  const [showAuthModal, setShowAuthModal] = useState(false);

  return (
    <header className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b transition-colors`}>
      <div className="container mx-auto px-4 py-4 flex items-center justify-between max-w-6xl">
        {/* Logo */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xl">AW</span>
          </div>
          <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            AppWhistler
          </h1>
          <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            Truth-Verified Apps
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-4">
          {/* Dark Mode Toggle */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            className={`p-2 rounded-lg ${darkMode ? 'bg-gray-700 text-yellow-300' : 'bg-gray-100 text-gray-600'} hover:opacity-80 transition`}
            aria-label="Toggle dark mode"
          >
            {darkMode ? '☀️' : '🌙'}
          </button>

          {/* User Profile or Login */}
          {user ? (
            <div className="flex items-center space-x-3">
              <div className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                <div className="font-semibold">{user.username}</div>
                <div className="text-xs text-blue-500">Truth Score: {user.truthScore}</div>
              </div>
              <button
                onClick={() => setUser(null)}
                className="text-sm text-red-500 hover:text-red-600"
              >
                Logout
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowAuthModal(true)}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
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
    { id: 'discover', label: '🔍 Discover Apps', icon: '📱' },
    { id: 'factcheck', label: '✓ Fact Checks', icon: '✓' },
    { id: 'profile', label: '👤 Profile', icon: '👤' }
  ];

  return (
    <nav className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b`}>
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="flex space-x-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-3 font-medium transition ${
                activeTab === tab.id
                  ? darkMode
                    ? 'text-blue-400 border-b-2 border-blue-400'
                    : 'text-blue-600 border-b-2 border-blue-600'
                  : darkMode
                  ? 'text-gray-400 hover:text-gray-200'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
}

/**
 * Discover Tab - App Search & Recommendations
 */
function DiscoverTab({ searchQuery, setSearchQuery, apps, darkMode }) {
  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <div className="flex items-center space-x-4">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search for apps by name, category, or developer..."
          className={`flex-1 px-4 py-3 rounded-lg ${
            darkMode 
              ? 'bg-gray-800 text-white border-gray-700' 
              : 'bg-white text-gray-900 border-gray-300'
          } border focus:outline-none focus:ring-2 focus:ring-blue-500`}
        />
        <button className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition">
          Search
        </button>
      </div>

      {/* App Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {apps.length > 0 ? (
          apps.map(app => (
            <AppCard key={app.id} app={app} darkMode={darkMode} />
          ))
        ) : (
          <div className={`col-span-full text-center py-12 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            {searchQuery ? 'No apps found' : 'Start searching for apps...'}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * App Card Component
 */
function AppCard({ app, darkMode }) {
  return (
    <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg p-4 shadow-md hover:shadow-lg transition`}>
      <div className="flex items-start space-x-4">
        <img 
          src={app.icon_url || '/placeholder-icon.png'} 
          alt={app.name}
          className="w-16 h-16 rounded-lg"
        />
        <div className="flex-1">
          <h3 className={`font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            {app.name}
          </h3>
          <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            {app.developer}
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        <div className="flex items-center justify-between">
          <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Truth Rating
          </span>
          <span className="font-bold text-blue-500">
            {app.truth_rating?.toFixed(1)}/5.0
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Downloads
          </span>
          <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            {(app.download_count || 0).toLocaleString()}
          </span>
        </div>
      </div>

      <button className="mt-4 w-full py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition">
        View Details
      </button>
    </div>
  );
}

/**
 * Fact Check Tab - NewsTruth Module
 */
function FactCheckTab({ factChecks, darkMode }) {
  const [newClaim, setNewClaim] = useState('');

  const submitClaim = async () => {
    // Submit to backend for fact-checking
    console.log('Submitting claim:', newClaim);
  };

  return (
    <div className="space-y-6">
      {/* Submit Claim */}
      <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg p-6 shadow-md`}>
        <h2 className={`text-xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          Submit a Claim for Fact-Checking
        </h2>
        <textarea
          value={newClaim}
          onChange={(e) => setNewClaim(e.target.value)}
          placeholder="Enter a claim to verify (e.g., 'The Earth is flat')"
          className={`w-full px-4 py-3 rounded-lg ${
            darkMode 
              ? 'bg-gray-700 text-white border-gray-600' 
              : 'bg-gray-50 text-gray-900 border-gray-300'
          } border focus:outline-none focus:ring-2 focus:ring-blue-500`}
          rows={3}
        />
        <button 
          onClick={submitClaim}
          className="mt-3 px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
        >
          Verify Claim
        </button>
      </div>

      {/* Recent Fact Checks */}
      <div className="space-y-4">
        {factChecks.length > 0 ? (
          factChecks.map(fc => (
            <FactCheckCard key={fc.id} factCheck={fc} darkMode={darkMode} />
          ))
        ) : (
          <div className={`text-center py-12 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            No fact checks yet. Submit the first one!
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Fact Check Card Component
 */
function FactCheckCard({ factCheck, darkMode }) {
  const verdictColors = {
    TRUE: 'bg-green-500',
    FALSE: 'bg-red-500',
    MISLEADING: 'bg-yellow-500',
    UNVERIFIED: 'bg-gray-500'
  };

  return (
    <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg p-6 shadow-md`}>
      <div className="flex items-start justify-between">
        <h3 className={`font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          {factCheck.claim}
        </h3>
        <span className={`px-3 py-1 rounded-full text-white text-sm ${verdictColors[factCheck.verdict]}`}>
          {factCheck.verdict}
        </span>
      </div>
      <p className={`mt-2 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
        {factCheck.explanation}
      </p>
    </div>
  );
}

/**
 * Profile Tab - User Info & Stats
 */
function ProfileTab({ user, darkMode }) {
  if (!user) {
    return (
      <div className={`text-center py-12 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
        Please sign in to view your profile
      </div>
    );
  }

  return (
    <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg p-6 shadow-md`}>
      <h2 className={`text-2xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
        Profile
      </h2>
      <div className="space-y-3">
        <div>
          <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Username:</span>
          <span className={`ml-2 font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            {user.username}
          </span>
        </div>
        <div>
          <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Truth Score:</span>
          <span className="ml-2 font-bold text-blue-500">{user.truthScore}</span>
        </div>
      </div>
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg p-8 max-w-md w-full mx-4`}>
        <h2 className={`text-2xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          Sign In
        </h2>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          className={`w-full px-4 py-2 mb-3 rounded-lg ${
            darkMode ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'
          } border focus:outline-none focus:ring-2 focus:ring-blue-500`}
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className={`w-full px-4 py-2 mb-4 rounded-lg ${
            darkMode ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'
          } border focus:outline-none focus:ring-2 focus:ring-blue-500`}
        />
        <div className="flex space-x-3">
          <button
            onClick={handleLogin}
            className="flex-1 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
          >
            Login
          </button>
          <button
            onClick={onClose}
            className={`flex-1 py-2 rounded-lg ${
              darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'
            } hover:opacity-80 transition`}
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
    <footer className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-t mt-12`}>
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        <div className="flex items-center justify-between">
          <div className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
            © 2025 AppWhistler - 100% Open Source
          </div>
          <div className="flex space-x-4">
            <a href="#" className="text-blue-500 hover:text-blue-600">GitHub</a>
            <a href="#" className="text-blue-500 hover:text-blue-600">Donate</a>
            <a href="#" className="text-blue-500 hover:text-blue-600">About</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default App;