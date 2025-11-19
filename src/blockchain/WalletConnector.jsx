// src/blockchain/WalletConnector.jsx
// MetaMask wallet connection and management
// Integrates with ethers.js for blockchain interactions

import React, { useState, useEffect } from 'react';

/**
 * WalletConnector Component
 * Handles MetaMask connection, account management, and transaction signing
 * 
 * @component
 * @example
 * const { account, connected, connectWallet, disconnectWallet } = useWallet();
 * return <WalletConnector account={account} onConnect={connectWallet} />
 */
export const useWallet = () => {
  const [account, setAccount] = useState(null);
  const [connected, setConnected] = useState(false);
  const [chainId, setChainId] = useState(null);
  const [error, setError] = useState(null);
  const [signer, setSigner] = useState(null);

  /**
   * Connect to MetaMask wallet
   * @async
   * @returns {Promise<string|null>} Connected account address or null
   */
  const connectWallet = async () => {
    try {
      // Check if MetaMask is installed
      if (!window.ethereum) {
        setError('MetaMask not installed. Please install MetaMask extension.');
        return null;
      }

      // Request account access
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });

      if (accounts && accounts.length > 0) {
        const selectedAccount = accounts[0];
        setAccount(selectedAccount);
        setConnected(true);
        setError(null);

        // Get chain ID
        const chainIdHex = await window.ethereum.request({
          method: 'eth_chainId',
        });
        setChainId(parseInt(chainIdHex, 16));

        // Initialize ethers signer if available
        if (window.ethereum && typeof window.ethereum.request === 'function') {
          try {
            const ethers = await import('ethers');
            const provider = new ethers.BrowserProvider(window.ethereum);
            const s = await provider.getSigner();
            setSigner(s);
          } catch (err) {
            console.debug('ethers not available for signer initialization');
          }
        }

        return selectedAccount;
      }
    } catch (err) {
      setError(err.message);
      setConnected(false);
      console.error('Wallet connection error:', err);
    }
    return null;
  };

  /**
   * Disconnect from wallet
   */
  const disconnectWallet = () => {
    setAccount(null);
    setConnected(false);
    setSigner(null);
    setError(null);
  };

  /**
   * Sign a message with the connected wallet
   * @async
   * @param {string} message - Message to sign
   * @returns {Promise<string>} Signed message (signature)
   */
  const signMessage = async (message) => {
    if (!signer) {
      throw new Error('Wallet not connected');
    }
    return signer.signMessage(message);
  };

  /**
   * Send a transaction
   * @async
   * @param {object} tx - Transaction object
   * @returns {Promise<string>} Transaction hash
   */
  const sendTransaction = async (tx) => {
    if (!signer) {
      throw new Error('Wallet not connected');
    }
    const response = await signer.sendTransaction(tx);
    return response.hash;
  };

  // Listen for account changes
  useEffect(() => {
    if (window.ethereum) {
      const handleAccountsChanged = (accounts) => {
        if (accounts.length === 0) {
          disconnectWallet();
        } else {
          setAccount(accounts[0]);
        }
      };

      const handleChainChanged = (chainIdHex) => {
        setChainId(parseInt(chainIdHex, 16));
      };

      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);

      return () => {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      };
    }
  }, []);

  return {
    account,
    connected,
    chainId,
    error,
    signer,
    connectWallet,
    disconnectWallet,
    signMessage,
    sendTransaction,
  };
};

/**
 * WalletConnector UI Component
 * @param {object} props
 * @param {function} props.onConnect - Callback when wallet connects
 * @param {function} props.onDisconnect - Callback when wallet disconnects
 */
export const WalletConnector = ({ onConnect, onDisconnect }) => {
  const { account, connected, error, connectWallet, disconnectWallet } = useWallet();

  const handleConnect = async () => {
    const addr = await connectWallet();
    if (addr && onConnect) {
      onConnect(addr);
    }
  };

  const handleDisconnect = () => {
    disconnectWallet();
    if (onDisconnect) {
      onDisconnect();
    }
  };

  return (
    <div className="wallet-connector">
      {!connected ? (
        <button
          onClick={handleConnect}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          aria-label="Connect MetaMask wallet"
        >
          Connect Wallet
        </button>
      ) : (
        <div className="flex items-center gap-4">
          <span className="text-sm font-mono text-gray-600">
            {account?.slice(0, 6)}...{account?.slice(-4)}
          </span>
          <button
            onClick={handleDisconnect}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
            aria-label="Disconnect wallet"
          >
            Disconnect
          </button>
        </div>
      )}
      {error && (
        <div className="mt-2 p-2 bg-red-100 text-red-700 rounded text-sm">
          {error}
        </div>
      )}
    </div>
  );
};

export default WalletConnector;
