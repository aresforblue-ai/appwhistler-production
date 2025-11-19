// src/blockchain/TransactionHistory.jsx
// Display on-chain fact-check transactions and proofs

import React, { useState, useEffect } from 'react';

/**
 * TransactionHistory Component
 * Displays user's blockchain transactions for fact-checks
 * Shows transaction hash, status, timestamp, and block explorer link
 * 
 * @component
 * @param {object} props
 * @param {string} props.userAddress - Wallet address to fetch history for
 * @param {string} props.networkId - Blockchain network ID (1=Mainnet, 5=Goerli, etc)
 * @param {array} props.transactions - Array of transaction objects
 */
export const TransactionHistory = ({ userAddress, networkId = 5, transactions = [] }) => {
  const [displayTransactions, setDisplayTransactions] = useState([]);
  const [loading, setLoading] = useState(false);

  // Network configuration
  const networkConfig = {
    1: { name: 'Mainnet', explorer: 'https://etherscan.io' },
    5: { name: 'Goerli', explorer: 'https://goerli.etherscan.io' },
    137: { name: 'Polygon', explorer: 'https://polygonscan.com' },
    42161: { name: 'Arbitrum', explorer: 'https://arbiscan.io' },
  };

  const explorerUrl = networkConfig[networkId]?.explorer || 'https://etherscan.io';

  useEffect(() => {
    if (transactions && transactions.length > 0) {
      // Sort by timestamp, newest first
      const sorted = [...transactions].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      setDisplayTransactions(sorted);
    }
  }, [transactions]);

  /**
   * Format transaction hash for display
   * @param {string} hash - Full transaction hash
   * @returns {string} Shortened hash (first 6 + last 4 chars)
   */
  const formatHash = (hash) => {
    if (!hash) return 'N/A';
    return `${hash.slice(0, 6)}...${hash.slice(-4)}`;
  };

  /**
   * Format Unix timestamp to readable date
   * @param {number} timestamp - Unix timestamp in seconds
   * @returns {string} Formatted date string
   */
  const formatDate = (timestamp) => {
    if (!timestamp) return 'Pending';
    return new Date(timestamp * 1000).toLocaleString();
  };

  /**
   * Get status badge color
   * @param {string} status - Transaction status (success, pending, failed)
   * @returns {string} CSS class for status
   */
  const getStatusColor = (status) => {
    switch (status) {
      case 'success':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (displayTransactions.length === 0) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg text-center text-gray-500">
        <p>No blockchain transactions yet.</p>
        <p className="text-sm mt-2">Stamp your first fact-check to appear here!</p>
      </div>
    );
  }

  return (
    <div className="transaction-history">
      <h3 className="text-lg font-semibold mb-4">Transaction History</h3>
      <div className="space-y-3">
        {displayTransactions.map((tx, idx) => (
          <div
            key={tx.id || `tx-${idx}`}
            className="p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition"
          >
            <div className="flex items-start justify-between mb-2">
              <div>
                <a
                  href={`${explorerUrl}/tx/${tx.hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-blue-600 hover:underline"
                  title={tx.hash}
                >
                  {formatHash(tx.hash)}
                  <span className="ml-2 text-xs">↗</span>
                </a>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(tx.status)}`}>
                {tx.status || 'Unknown'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Type</p>
                <p className="font-medium">{tx.type || 'Fact-Check'}</p>
              </div>
              <div>
                <p className="text-gray-500">Timestamp</p>
                <p className="font-medium">{formatDate(tx.timestamp)}</p>
              </div>
            </div>

            {tx.description && (
              <div className="mt-2 pt-2 border-t border-gray-100">
                <p className="text-sm text-gray-600">{tx.description}</p>
              </div>
            )}

            {tx.factCheckId && (
              <div className="mt-2 text-xs text-gray-500">
                Fact-Check ID: <span className="font-mono">{tx.factCheckId}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Hook to fetch transaction history from GraphQL
 * @param {string} userAddress - Wallet address
 * @returns {object} { transactions, loading, error, refetch }
 */
export const useTransactionHistory = (userAddress) => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchTransactions = async () => {
    if (!userAddress) return;

    setLoading(true);
    setError(null);

    try {
      // GraphQL query to fetch user's blockchain transactions
      const response = await fetch(process.env.REACT_APP_GRAPHQL_URL || 'http://localhost:5000/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('appwhistler_token')}`,
        },
        body: JSON.stringify({
          query: `
            query GetUserTransactions($userAddress: String!) {
              userTransactions(walletAddress: $userAddress) {
                id
                hash
                type
                status
                timestamp
                factCheckId
                description
              }
            }
          `,
          variables: { userAddress },
        }),
      });

      const data = await response.json();

      if (data.errors) {
        setError(data.errors[0]?.message || 'Failed to fetch transactions');
      } else if (data.data?.userTransactions) {
        setTransactions(data.data.userTransactions);
      }
    } catch (err) {
      setError(err.message);
      console.error('Transaction fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [userAddress]);

  return {
    transactions,
    loading,
    error,
    refetch: fetchTransactions,
  };
};

export default TransactionHistory;
