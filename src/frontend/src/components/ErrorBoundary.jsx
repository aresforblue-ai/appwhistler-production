// src/frontend/src/components/ErrorBoundary.jsx
// React error boundary for graceful error handling

import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null,
      errorInfo: null,
      errorCount: 0
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log error for monitoring
    console.error('🚨 Error caught by boundary:', error, errorInfo);
    
    this.setState(prevState => ({
      error,
      errorInfo,
      errorCount: prevState.errorCount + 1
    }));

    // Optional: Send to error tracking service (Sentry, etc.)
    if (window.Sentry) {
      window.Sentry.captureException(error, { contexts: { react: errorInfo } });
    }
  }

  handleReset = () => {
    this.setState({ 
      hasError: false, 
      error: null,
      errorInfo: null 
    });
  };

  render() {
    if (this.state.hasError) {
      // Production: Show simple error message
      if (process.env.NODE_ENV === 'production') {
        return (
          <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
            <div className="bg-slate-800 rounded-lg border border-red-500/50 p-8 max-w-md text-center shadow-xl">
              <div className="text-4xl mb-4">⚠️</div>
              <h1 className="text-2xl font-bold text-white mb-2">Oops! Something went wrong</h1>
              <p className="text-slate-400 mb-6">
                We encountered an unexpected error. Please try refreshing the page.
              </p>
              <button
                onClick={() => window.location.reload()}
                className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-semibold py-3 rounded-lg transition duration-200"
              >
                Refresh Page
              </button>
              <button
                onClick={() => window.location.href = '/'}
                className="w-full mt-2 bg-slate-700 hover:bg-slate-600 text-white font-semibold py-3 rounded-lg transition duration-200"
              >
                Go Home
              </button>
            </div>
          </div>
        );
      }

      // Development: Show detailed error info
      return (
        <div className="min-h-screen bg-red-50 p-8">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-lg shadow-lg border-4 border-red-500 p-8">
              <h1 className="text-3xl font-bold text-red-600 mb-4">🚨 Error Boundary</h1>
              
              <details className="mb-6 cursor-pointer">
                <summary className="font-semibold text-lg text-gray-800 hover:text-red-600">
                  Error Details
                </summary>
                <pre className="mt-4 bg-gray-100 p-4 rounded overflow-auto text-sm text-gray-900">
                  {this.state.error && this.state.error.toString()}
                </pre>
              </details>

              <details className="mb-6 cursor-pointer">
                <summary className="font-semibold text-lg text-gray-800 hover:text-red-600">
                  Component Stack
                </summary>
                <pre className="mt-4 bg-gray-100 p-4 rounded overflow-auto text-sm text-gray-900">
                  {this.state.errorInfo && this.state.errorInfo.componentStack}
                </pre>
              </details>

              <div className="flex gap-4">
                <button
                  onClick={this.handleReset}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition"
                >
                  Try Again
                </button>
                <button
                  onClick={() => window.location.href = '/'}
                  className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-lg transition"
                >
                  Go Home
                </button>
              </div>

              {this.state.errorCount > 3 && (
                <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded text-yellow-800">
                  ⚠️ Multiple errors detected ({this.state.errorCount}). 
                  <a href="mailto:support@appwhistler.com" className="underline font-semibold">
                    {' '}Contact support
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
