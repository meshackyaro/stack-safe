/**
 * Deposit Page - Multiple STX deposits interface
 */

'use client';

import { useState, useRef } from 'react';
import DepositsDashboard from '@/components/deposits-dashboard';
import CreateDepositForm from '@/components/create-deposit-form';
import PriceSyncStatus from '@/components/price-sync-status';
import LivePriceTicker from '@/components/live-price-ticker';
import PriceUpdateNotification from '@/components/price-update-notification';

export default function DepositPage() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'create'>('dashboard');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleDepositCreated = () => {
    // Trigger a refresh of the dashboard
    setRefreshTrigger(prev => prev + 1);
    // Switch back to dashboard after creating a deposit
    setActiveTab('dashboard');
  };

  return (
    <div className="min-h-screen bg-gray-900 py-8">
      {/* Price Update Notifications */}
      <PriceUpdateNotification threshold={1.5} duration={6000} />
      
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Multiple Deposits</h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Create and manage multiple independent deposits with different lock periods and amounts
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="mb-8 bg-gray-800 rounded-lg shadow-md p-6">
          <div className="border-b border-gray-700">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                  activeTab === 'dashboard'
                    ? 'border-purple-500 text-purple-600 dark:text-purple-400'
                    : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <span className="mr-2">💎</span>
                My Deposits
              </button>
              <button
                onClick={() => setActiveTab('create')}
                className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                  activeTab === 'create'
                    ? 'border-purple-500 text-purple-600 dark:text-purple-400'
                    : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <span className="mr-2">➕</span>
                Create Deposit
              </button>
            </nav>
          </div>
        </div>

        {/* Live Price Information */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <LivePriceTicker />
          <PriceSyncStatus />
        </div>

        {/* Tab Content */}
        {activeTab === 'dashboard' && (
          <DepositsDashboard 
            onCreateDeposit={() => setActiveTab('create')}
            refreshTrigger={refreshTrigger}
          />
        )}

        {activeTab === 'create' && (
          <CreateDepositForm 
            onDepositCreated={handleDepositCreated}
            onCancel={() => setActiveTab('dashboard')}
          />
        )}

        {/* Feature Highlights */}
        <div className="mt-12 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-lg p-8">
          <h2 className="text-2xl font-bold text-white mb-6">Multiple Deposits Benefits</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-4xl mb-3">🎯</div>
              <h3 className="text-lg font-semibold text-white mb-2">Independent Control</h3>
              <p className="text-gray-600 dark:text-gray-300">Each deposit has its own lock period and can be withdrawn separately</p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-3">💰</div>
              <h3 className="text-lg font-semibold text-white mb-2">Dynamic Minimum</h3>
              <p className="text-gray-600 dark:text-gray-300">Minimum deposit automatically adjusts to maintain $2 USD value based on real-time STX price</p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-3">📊</div>
              <h3 className="text-lg font-semibold text-white mb-2">Portfolio Management</h3>
              <p className="text-gray-600 dark:text-gray-300">Track all your deposits in one dashboard with detailed status information</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}