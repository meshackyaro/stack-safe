/**
 * Wallet Connection Component
 * Handles Stacks wallet connection UI and user authentication state
 */

'use client';

import { useWallet } from '@/contexts/wallet-context';

export default function WalletConnect() {
  const { user, isLoading, isConnected, error, connectWallet, disconnectWallet } = useWallet();

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-400">Checking wallet connection...</span>
      </div>
    );
  }

  // Show connected state with user info and disconnect option
  if (isConnected && user) {
    return (
      <div className="flex items-center justify-between p-4 bg-green-900/20 border border-green-800 rounded-lg">
        <div className="flex flex-col">
          <span className="text-sm font-medium text-green-200">Wallet Connected</span>
          <span className="text-xs text-green-600 dark:text-green-300 font-mono">
            {user.address.slice(0, 8)}...{user.address.slice(-8)}
          </span>
        </div>
        <button
          onClick={disconnectWallet}
          className="px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 bg-gray-700 border border-red-300 dark:border-red-600 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-gray-800"
        >
          Disconnect
        </button>
      </div>
    );
  }

  // Show connect button when not connected
  return (
    <div className="flex flex-col items-center p-6 bg-gray-800 dark:bg-gray-800 border border-gray-700 rounded-lg">
      <h3 className="text-lg font-medium text-white mb-2">Connect Your Wallet</h3>
      <p className="text-sm text-gray-400 dark:text-gray-300 mb-4 text-center">
        Connect your Stacks wallet to interact with GrowFundz
      </p>
      
      {error && (
        <div className="w-full mb-4 p-3 bg-red-900/20 border border-red-800 rounded-md">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}
      
      <button
        onClick={connectWallet}
        className="px-6 py-3 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
        disabled={isLoading}
      >
        {isLoading ? 'Connecting...' : 'Connect Wallet'}
      </button>
      
      <p className="text-xs text-gray-400 mt-3 text-center">
        Make sure your wallet is set to <strong>testnet</strong> mode
      </p>
    </div>
  );
}