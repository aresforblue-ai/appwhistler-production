import React from 'react';
import ReactDOM from 'react-dom/client';
import { ApolloProvider } from '@apollo/client';
import App from './App.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import client from './apollo/client.js';
import './index.css';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <ApolloProvider client={client}>
        <App />
      </ApolloProvider>
    </ErrorBoundary>
  </React.StrictMode>
);

console.log('[AppWhistler] Mounted ✅');