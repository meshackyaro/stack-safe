/**
 * Dashboard Page - Main landing page for the GrowFundz dApp
 * Shows wallet connection, vault info, and quick action buttons
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import WalletConnect from '@/components/wallet-connect';
import VaultInfo from '@/components/vault-info';
import ContractNotDeployedBanner from '@/components/contract-not-deployed-banner';
import { useWallet } from '@/contexts/wallet-context';

export default function Dashboard() {
  const { isConnected, user } = useWallet();
  const [refreshKey, setRefreshKey] = useState(0);

  // Force refresh of vault info after transactions
  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  // Reset refresh key when wallet disconnects to ensure clean state
  useEffect(() => {
    if (!isConnected || !user) {
      setRefreshKey(0);
    }
  }, [isConnected, user?.address]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">GrowFundz Dashboard</h1>
        <p className="text-lg text-gray-300">
          A decentralized savings vault with flexible time-based lock periods on Stacks blockchain
        </p>
      </div>

      {/* Contract Deployment Warning */}
      <ContractNotDeployedBanner />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Wallet & Vault Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Wallet Connection */}
          <WalletConnect />
          
          {/* Vault Information - Only show when wallet is connected */}
          {isConnected && user && (
            <VaultInfo 
              key={user.address} // Force re-render on wallet change
              refreshTrigger={refreshKey}
            />
          )}
        </div>

        {/* Right Column - Quick Actions */}
        <div className="space-y-6">
          {/* Quick Actions Card */}
          <div className="p-6 bg-gray-800 border border-gray-700 rounded-lg shadow-sm">
            <h2 className="text-xl font-semibold text-white mb-4">Quick Actions</h2>
            
            {isConnected ? (
              <div className="space-y-3">
                <Link
                  href="/deposit"
                  className="w-full flex items-center justify-center px-4 py-3 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  💰 Deposit STX
                </Link>
                
                <Link
                  href="/withdraw"
                  className="w-full flex items-center justify-center px-4 py-3 text-sm font-medium text-gray-200 bg-gray-700 border border-gray-600 rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800"
                >
                  💸 Withdraw STX
                </Link>
                
                <button
                  onClick={handleRefresh}
                  className="w-full flex items-center justify-center px-4 py-3 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-gray-800"
                >
                  🔄 Refresh Data
                </button>
              </div>
            ) : (
              <p className="text-gray-400 text-center py-4">
                Connect your wallet to access vault features
              </p>
            )}
          </div>

          {/* How It Works Card */}
          <div className="p-6 bg-blue-900/20 border border-blue-800 rounded-lg">
            <h3 className="text-lg font-semibold text-blue-100 mb-3">How It Works</h3>
            <ul className="text-sm text-blue-200 space-y-2">
              <li className="flex items-start">
                <span className="font-semibold mr-2">1.</span>
                Connect your Stacks wallet
              </li>
              <li className="flex items-start">
                <span className="font-semibold mr-2">2.</span>
                Choose your deposit amount
              </li>
              <li className="flex items-start">
                <span className="font-semibold mr-2">3.</span>
                Select lock period (1 hour to 1 year)
              </li>
              <li className="flex items-start">
                <span className="font-semibold mr-2">4.</span>
                Confirm deposit transaction
              </li>
              <li className="flex items-start">
                <span className="font-semibold mr-2">5.</span>
                Wait for lock period to expire
              </li>
              <li className="flex items-start">
                <span className="font-semibold mr-2">6.</span>
                Withdraw your funds when unlocked
              </li>
            </ul>
          </div>

          {/* Lock Period Benefits Card */}
          <div className="p-6 bg-green-900/20 border border-green-800 rounded-lg">
            <h3 className="text-lg font-semibold text-green-100 mb-3">💡 Lock Period Benefits</h3>
            <ul className="text-sm text-green-200 space-y-2">
              <li className="flex items-start">
                <span className="font-semibold mr-2">•</span>
                <strong>Short-term:</strong> Quick savings goals (1-8 hours)
              </li>
              <li className="flex items-start">
                <span className="font-semibold mr-2">•</span>
                <strong>Medium-term:</strong> Weekly/monthly discipline (1 day - 2 weeks)
              </li>
              <li className="flex items-start">
                <span className="font-semibold mr-2">•</span>
                <strong>Long-term:</strong> Serious savings commitment (1 month - 1 year)
              </li>
              <li className="flex items-start">
                <span className="font-semibold mr-2">•</span>
                Prevents impulsive spending decisions
              </li>
              <li className="flex items-start">
                <span className="font-semibold mr-2">•</span>
                Builds consistent saving habits
              </li>
            </ul>
          </div>

          {/* Contract Info Card */}
          <div className="p-6 bg-gray-800 border border-gray-700 rounded-lg">
            <h3 className="text-lg font-semibold text-white mb-3">Contract Info</h3>
            <div className="text-sm text-gray-300 space-y-2">
              <p><span className="font-medium">Network:</span> Testnet</p>
              <p><span className="font-medium">Lock Options:</span> 13 time periods</p>
              <p><span className="font-medium">Min Deposit:</span> $2.00 USD equivalent</p>
              <p><span className="font-medium">Block Time:</span> ~10 minutes</p>
              <div className="pt-2 border-t border-gray-600">
                <p className="text-xs text-gray-400">
                  Contract: {process.env.NEXT_PUBLIC_CONTRACT_NAME}
                </p>
                <p className="text-xs text-gray-400">
                  Address: {process.env.NEXT_PUBLIC_CONTRACT_ADDRESS?.slice(0, 10)}...
                </p>
              </div>
            </div>
          </div>


        </div>
      </div>
    </div>
  );
}
