// Error Boundary Component - Catches React errors and prevents full app crash
// CRITICAL FIX: Prevents white screen of death on unhandled errors

import React from 'react';
import * as Sentry from '@sentry/react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log error to console
    console.error('🔴 React Error Boundary caught an error:', error, errorInfo);
    
    // Log to Sentry if configured
    if (window.__APPWHISTLER_SENTRY__) {
      Sentry.captureException(error, { contexts: { react: { componentStack: errorInfo.componentStack } } });
    }
    
    // Update state with error details
    this.setState({
      error,
      errorInfo
    });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      // Fallback UI
      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
          <div className="max-w-2xl w-full bg-slate-900/80 backdrop-blur-xl rounded-3xl border border-red-500/30 p-8 shadow-2xl shadow-red-500/20">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center text-3xl">
                ⚠️
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Something Went Wrong</h1>
                <p className="text-slate-400 text-sm">The application encountered an unexpected error</p>
              </div>
            </div>

            <div className="bg-slate-950/50 rounded-2xl p-4 mb-6 border border-slate-800">
              <p className="text-red-400 font-mono text-sm break-words">
                {this.state.error && this.state.error.toString()}
              </p>
              {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
                <details className="mt-4">
                  <summary className="text-slate-400 text-xs cursor-pointer hover:text-slate-300">
                    Show stack trace
                  </summary>
                  <pre className="text-slate-500 text-xs mt-2 overflow-auto max-h-64">
                    {this.state.errorInfo.componentStack}
                  </pre>
                </details>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={this.handleReload}
                className="flex-1 rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 hover:shadow-xl transition"
              >
                Reload Page
              </button>
              <button
                onClick={this.handleGoHome}
                className="flex-1 rounded-2xl border border-slate-700 px-6 py-3 text-sm font-semibold text-slate-300 hover:bg-slate-800 transition"
              >
                Go to Home
              </button>
            </div>

            <p className="text-slate-500 text-xs text-center mt-6">
              If this error persists, please contact support with the error details above.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
