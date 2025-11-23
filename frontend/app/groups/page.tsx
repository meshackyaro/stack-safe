/**
 * Groups Page - Group savings interface
 */

'use client';

import { useState } from 'react';
import { useWallet } from '@/contexts/wallet-context';
import GroupDashboard from '@/components/group-dashboard';
import GroupBrowser from '@/components/group-browser';
import CreateGroupForm from '@/components/create-group-form';
import JoinGroupForm from '@/components/join-group-form';

type TabType = 'dashboard' | 'browse' | 'create' | 'join';

export default function GroupsPage() {
  const { isConnected } = useWallet();
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gray-900 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-white mb-2">Group Savings</h1>
            <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">
              Join forces with others to achieve shared savings goals. Create or join savings groups with time-locked deposits.
            </p>
            
            <div className="p-6 bg-gray-800 border border-gray-700 rounded-lg shadow-sm">
              <p className="text-gray-400">Please connect your wallet to access group savings features.</p>
            </div>

            {/* How It Works Section */}
            <div className="mt-12 p-6 bg-gray-50 dark:bg-gray-800 border border-gray-700 rounded-lg">
              <h3 className="text-lg font-semibold text-white mb-4">How Group Savings Works</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-gray-300">
                <div className="space-y-3">
                  <div className="flex items-start space-x-2">
                    <span className="font-semibold mr-2">1.</span>
                    <span>Create savings groups with custom goals and durations</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <span className="font-semibold mr-2">2.</span>
                    <span>Join groups to reserve your membership spot</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <span className="font-semibold mr-2">3.</span>
                    <span>Groups start when full or manually by creator</span>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-start space-x-2">
                    <span className="font-semibold mr-2">4.</span>
                    <span>Make deposits once the group lock period begins</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <span className="font-semibold mr-2">5.</span>
                    <span>All funds secured by smart contracts during lock</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <span className="font-semibold mr-2">6.</span>
                    <span>Withdraw your contributions when lock expires</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'dashboard' as TabType, name: 'My Groups', icon: '📊' },
    { id: 'browse' as TabType, name: 'Browse Groups', icon: '🔍' },
    { id: 'create' as TabType, name: 'Create Group', icon: '➕' },
    { id: 'join' as TabType, name: 'Join Group', icon: '🤝' },
  ];

  const handleGroupCreated = () => {
    // Switch to dashboard after creating a group
    setActiveTab('dashboard');
  };

  const handleGroupJoined = () => {
    // Switch to dashboard after joining a group
    setActiveTab('dashboard');
  };

  return (
    <div className="min-h-screen bg-gray-900 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Group Savings</h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Save together with friends, family, or community members with shared goals and time-locked commitments
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="mb-8 bg-gray-800 rounded-lg shadow-md p-6">
          <div className="border-b border-gray-700">
            <nav className="-mb-px flex space-x-8">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.name}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Main Content Based on Active Tab */}
        {activeTab === 'dashboard' && (
          <GroupDashboard 
            onCreateGroup={() => setActiveTab('create')}
            onJoinGroup={() => setActiveTab('browse')}
          />
        )}

        {activeTab === 'browse' && (
          <GroupBrowser 
            onGroupJoined={handleGroupJoined}
          />
        )}

        {/* Action Forms - Show when selected */}
        {activeTab === 'create' && (
          <div className="mt-8 space-y-6">
            <div className="bg-gray-800 rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">Create New Group</h2>
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className="text-gray-400 hover:text-gray-300"
                >
                  <span className="sr-only">Close</span>
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <CreateGroupForm onGroupCreated={handleGroupCreated} />
            </div>
            
            {/* Information Section */}
            <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-blue-100 mb-3">Creating a Group</h3>
              <div className="text-sm text-blue-200 space-y-2">
                <p>• <strong>Group Name:</strong> Choose a descriptive name (max 50 characters)</p>
                <p>• <strong>Lock Duration:</strong> How long funds will be locked after the group starts</p>
                <p>• <strong>Member Limit:</strong> Optional - set a maximum number of members</p>
                <p>• <strong>Auto-Start:</strong> Groups with member limits auto-start when full</p>
                <p>• <strong>Manual Start:</strong> Unlimited groups require manual start by creator</p>
                <p>• <strong>Deposit Phase:</strong> Members can only deposit after the group starts</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'join' && (
          <div className="mt-8 space-y-6">
            <div className="bg-gray-800 rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">Join Existing Group</h2>
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className="text-gray-400 hover:text-gray-300"
                >
                  <span className="sr-only">Close</span>
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <JoinGroupForm onGroupJoined={handleGroupJoined} />
            </div>
            
            {/* Information Section */}
            <div className="bg-green-900/20 border border-green-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-green-100 mb-3">Joining a Group</h3>
              <div className="text-sm text-green-200 space-y-2">
                <p>• <strong>Reserve Your Spot:</strong> Join groups to secure your membership</p>
                <p>• <strong>Open Groups:</strong> Only groups accepting new members are shown</p>
                <p>• <strong>Progress:</strong> See how close groups are to their member limits</p>
                <p>• <strong>Deposit Later:</strong> Make deposits once the group starts its lock period</p>
                <p>• <strong>Auto-Start:</strong> Groups with limits start when full, others start manually</p>
              </div>
            </div>
          </div>
        )}

        {/* Features Overview - Only show when dashboard is active */}
        {activeTab === 'dashboard' && (
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-4 bg-gray-800 border border-gray-700 rounded-lg shadow-sm">
              <div className="text-2xl mb-2">🔒</div>
              <h3 className="font-semibold text-white mb-2">Secure Savings</h3>
              <p className="text-sm text-gray-400">
                All funds are secured by smart contracts on the Stacks blockchain
              </p>
            </div>
            
            <div className="p-4 bg-gray-800 border border-gray-700 rounded-lg shadow-sm">
              <div className="text-2xl mb-2">⏰</div>
              <h3 className="font-semibold text-white mb-2">Time-Locked</h3>
              <p className="text-sm text-gray-400">
                Choose from 13 different lock durations, from 1 hour to 1 year
              </p>
            </div>
            
            <div className="p-4 bg-gray-800 border border-gray-700 rounded-lg shadow-sm">
              <div className="text-2xl mb-2">👥</div>
              <h3 className="font-semibold text-white mb-2">Collaborative</h3>
              <p className="text-sm text-gray-400">
                Work together with others to achieve shared savings goals
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}