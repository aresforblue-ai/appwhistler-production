// Apollo Client - The brain of our GraphQL connection
// Handles: Authentication, Caching, WebSocket subscriptions, Error handling

import { ApolloClient, InMemoryCache, createHttpLink, split } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { getMainDefinition } from '@apollo/client/utilities';
import { createClient } from 'graphql-ws';

// Backend URLs (from environment or defaults)
const HTTP_URI = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const WS_URI = import.meta.env.VITE_WS_URL || 'ws://localhost:5000';

// HTTP connection for queries and mutations
const httpLink = createHttpLink({
  uri: `${HTTP_URI}/graphql`,
  credentials: 'include', // Send cookies with requests
});

// Authentication middleware - adds JWT token to every request
const authLink = setContext((_, { headers }) => {
  // Get token from localStorage (set during login)
  const token = localStorage.getItem('appwhistler_token');
  
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : '',
    }
  };
});

// WebSocket connection for real-time subscriptions
const wsLink = new GraphQLWsLink(
  createClient({
    url: `${WS_URI}/graphql`,
    connectionParams: () => {
      const token = localStorage.getItem('appwhistler_token');
      return {
        authorization: token ? `Bearer ${token}` : '',
      };
    },
    // Reconnect on connection loss
    shouldRetry: () => true,
    retryAttempts: 5,
  })
);

// Smart link: Use WebSocket for subscriptions, HTTP for everything else
const splitLink = split(
  ({ query }) => {
    const definition = getMainDefinition(query);
    return (
      definition.kind === 'OperationDefinition' &&
      definition.operation === 'subscription'
    );
  },
  wsLink,
  authLink.concat(httpLink)
);

// Apollo Client instance
const client = new ApolloClient({
  link: splitLink,
  cache: new InMemoryCache({
    typePolicies: {
      Query: {
        fields: {
          // Cache trending apps for 5 minutes
          trendingApps: {
            merge(existing, incoming) {
              return incoming;
            },
          },
        },
      },
    },
  }),
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'cache-and-network', // Always check server, but show cache first
      errorPolicy: 'all', // Show partial data even if there are errors
    },
    query: {
      fetchPolicy: 'network-only', // Always get fresh data for queries
      errorPolicy: 'all',
    },
    mutate: {
      errorPolicy: 'all',
    },
  },
});

// Helper: Clear authentication (on logout)
export const clearAuth = () => {
  localStorage.removeItem('appwhistler_token');
  localStorage.removeItem('appwhistler_user');
  client.clearStore(); // Clear Apollo cache
};

// Helper: Set authentication (on login)
export const setAuth = (token, user) => {
  localStorage.setItem('appwhistler_token', token);
  localStorage.setItem('appwhistler_user', JSON.stringify(user));
};

// Helper: Get current user from localStorage
export const getCurrentUser = () => {
  const userStr = localStorage.getItem('appwhistler_user');
  return userStr ? JSON.parse(userStr) : null;
};

export default client;
