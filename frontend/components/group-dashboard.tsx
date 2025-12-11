/**
 * Group Dashboard Component
 * Displays user's group memberships with deposit/withdraw functionality
 */

'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@/contexts/wallet-context';
import { useGroupVault } from '@/hooks/use-group-vault';
import { getLockDurationOptions } from '@/lib/lock-options';

interface GroupWithUserData {
  groupId: number;
  creator: string;
  name: string;
  duration: number;
  threshold?: number;
  memberCount: number;
  closed: boolean;
  locked: boolean;
  startBlock?: number;
  lockExpiry?: number;
  isMember: boolean;
  userBalance: number;
  remainingBlocks: number;
  isUnlocked: boolean;
}

interface GroupDashboardProps {
  onCreateGroup?: () => void;
  onJoinGroup?: () => void;
}

export default function GroupDashboard({ onCreateGroup, onJoinGroup }: GroupDashboardProps) {
  const { user, isConnected } = useWallet();
  const { 
    fetchAllGroupsWithUserData, 
    groupDeposit, 
    groupWithdraw, 
    closeGroup,
    startGroupLock,
    error: hookError 
  } = useGroupVault();
  
  const [groups, setGroups] = useState<GroupWithUserData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [actionLoading, setActionLoading] = useState<{ [key: string]: boolean }>({});
  
  // Form states for deposit/withdraw
  const [depositAmounts, setDepositAmounts] = useState<{ [key: number]: string }>({});
  const [withdrawAmounts, setWithdrawAmounts] = useState<{ [key: number]: string }>({});

  // Get lock duration options for display
  const lockOptions = getLockDurationOptions();

  // Load user's groups (groups where user is a member OR creator)
  useEffect(() => {
    const loadGroups = async () => {
      if (!user) {
        setGroups([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const allGroups = await fetchAllGroupsWithUserData();
        // Show groups where user is a member (includes groups they created)
        const userGroups = allGroups.filter(group => group.isMember);
        setGroups(userGroups);
      } catch (err) {
        console.error('Error loading groups:', err);
        setError('Failed to load your groups');
      } finally {
        setIsLoading(false);
      }
    };

    loadGroups();
  }, [user, fetchAllGroupsWithUserData]);

  // Get lock duration label from duration in blocks
  const getLockDurationLabel = (duration: number) => {
    const blockMappings: Record<number, number> = {
      6: 1, 18: 2, 36: 3, 48: 4, 144: 5, 720: 6, 1008: 7, 
      2016: 8, 4320: 9, 12960: 10, 25920: 11, 38880: 12, 52560: 13,
    };
    
    const optionValue = blockMappings[duration];
    const option = lockOptions.find(opt => opt.value === optionValue);
    return option ? option.label : `${duration} blocks`;
  };

  // Handle deposit
  const handleDeposit = async (groupId: number) => {
    const amount = depositAmounts[groupId];
    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid deposit amount');
      return;
    }

    const actionKey = `deposit-${groupId}`;
    setActionLoading(prev => ({ ...prev, [actionKey]: true }));
    setError('');
    setSuccess('');

    try {
      const txId = await groupDeposit({
        groupId,
        amount: parseFloat(amount),
      });

      setSuccess(`Deposit successful! Transaction ID: ${txId}`);
      setDepositAmounts(prev => ({ ...prev, [groupId]: '' }));
      
      // Refresh groups data
      const updatedGroups = await fetchAllGroupsWithUserData();
      const userGroups = updatedGroups.filter(group => group.isMember);
      setGroups(userGroups);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to deposit';
      setError(errorMessage);
    } finally {
      setActionLoading(prev => ({ ...prev, [actionKey]: false }));
    }
  };

  // Handle withdraw
  const handleWithdraw = async (groupId: number) => {
    const amount = withdrawAmounts[groupId];
    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid withdrawal amount');
      return;
    }

    const actionKey = `withdraw-${groupId}`;
    setActionLoading(prev => ({ ...prev, [actionKey]: true }));
    setError('');
    setSuccess('');

    try {
      const txId = await groupWithdraw({
        groupId,
        amount: parseFloat(amount),
      });

      setSuccess(`Withdrawal successful! Transaction ID: ${txId}`);
      setWithdrawAmounts(prev => ({ ...prev, [groupId]: '' }));
      
      // Refresh groups data
      const updatedGroups = await fetchAllGroupsWithUserData();
      const userGroups = updatedGroups.filter(group => group.isMember);
      setGroups(userGroups);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to withdraw';
      setError(errorMessage);
    } finally {
      setActionLoading(prev => ({ ...prev, [actionKey]: false }));
    }
  };

  // Handle close group (creator only)
  const handleCloseGroup = async (groupId: number) => {
    const actionKey = `close-${groupId}`;
    setActionLoading(prev => ({ ...prev, [actionKey]: true }));
    setError('');
    setSuccess('');

    try {
      const txId = await closeGroup(groupId);
      setSuccess(`Group closed successfully! Transaction ID: ${txId}`);
      
      // Refresh groups data
      const updatedGroups = await fetchAllGroupsWithUserData();
      const userGroups = updatedGroups.filter(group => group.isMember);
      setGroups(userGroups);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to close group';
      setError(errorMessage);
    } finally {
      setActionLoading(prev => ({ ...prev, [actionKey]: false }));
    }
  };

  // Handle start group lock (creator only)
  const handleStartLock = async (groupId: number) => {
    const actionKey = `start-lock-${groupId}`;
    setActionLoading(prev => ({ ...prev, [actionKey]: true }));
    setError('');
    setSuccess('');

    try {
      const txId = await startGroupLock(groupId);
      setSuccess(`Savings period started! Transaction ID: ${txId}`);
      
      // Refresh groups data
      const updatedGroups = await fetchAllGroupsWithUserData();
      const userGroups = updatedGroups.filter(group => group.isMember);
      setGroups(userGroups);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start savings period';
      setError(errorMessage);
    } finally {
      setActionLoading(prev => ({ ...prev, [actionKey]: false }));
    }
  };

  // Format time remaining
  const formatTimeRemaining = (blocks: number) => {
    if (blocks <= 0) return 'Unlocked';
    
    // Approximate conversion (10 minutes per block)
    const minutes = blocks * 10;
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days} day${days !== 1 ? 's' : ''}`;
    if (hours > 0) return `${hours} hour${hours !== 1 ? 's' : ''}`;
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  };

  if (!isConnected) {
    return (
      <div className="bg-gray-800 rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-white mb-6">My Groups</h2>
        <div className="text-center py-8">
          <p className="text-gray-500">Please connect your wallet to view your groups</p>
        </div>
      </div>
    );
  }

  // Calculate total balance across all groups
  const totalBalance = groups.reduce((sum, group) => sum + group.userBalance, 0);
  const activeGroups = groups.filter(group => group.locked && !group.isUnlocked).length;
  const completedGroups = groups.filter(group => group.isUnlocked).length;

  return (
    <div className="space-y-6">
      {/* Header with Total Balance */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg shadow-lg p-6 text-white">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm text-blue-100">Total Balance</p>
            <p className="text-2xl font-bold text-white">{totalBalance.toFixed(6)} STX</p>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <span className="text-2xl">👥</span>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-blue-800">Total Groups</p>
              <p className="text-lg font-semibold text-blue-900">{groups.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-green-50 rounded-lg p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <span className="text-2xl">🔄</span>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-green-800">Active Groups</p>
              <p className="text-lg font-semibold text-green-900">{activeGroups}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-yellow-50 rounded-lg p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <span className="text-2xl">✅</span>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-yellow-800">Completed</p>
              <p className="text-lg font-semibold text-yellow-900">{completedGroups}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-purple-50 rounded-lg p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <span className="text-2xl">💰</span>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-purple-800">Total Saved</p>
              <p className="text-lg font-semibold text-purple-900">{totalBalance.toFixed(2)} STX</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-400">Loading your groups...</span>
        </div>
      )}

      {/* Error Display */}
      {(error || hookError) && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error || hookError}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success Display */}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-6">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800">Success</h3>
              <div className="mt-2 text-sm text-green-700">
                <p>{success}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Groups List */}
      {!isLoading && (
        <>
          {groups.length === 0 ? (
            <div>
              {/* Empty State Message */}
              <div className="text-center py-8 bg-gray-800 rounded-lg">
                <div className="text-gray-500 mb-4">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-white mb-2">Start Your Group Savings Journey</h3>
                <p className="text-gray-500 mb-6">You haven&apos;t joined any savings groups yet. Create your first group or join an existing one to start saving together!</p>
                
                {/* Quick Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  {onCreateGroup && (
                    <button
                      onClick={onCreateGroup}
                      className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <span className="mr-2">➕</span>
                      Create Your First Group
                    </button>
                  )}
                  {onJoinGroup && (
                    <button
                      onClick={onJoinGroup}
                      className="inline-flex items-center px-6 py-3 border border-gray-600 text-base font-medium rounded-md shadow-sm text-gray-300 dark:text-gray-200 bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800"
                    >
                      <span className="mr-2">🤝</span>
                      Join an Existing Group
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Welcome Message */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <span className="text-2xl">👋</span>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-blue-800">Welcome to your Group Savings Dashboard</h3>
                    <div className="mt-1 text-sm text-blue-700">
                      <p>Here you can manage all your group memberships, make deposits, and track your savings progress.</p>
                    </div>
                  </div>
                </div>
              </div>

              {groups.map((group) => {
                const isCreator = user && group.creator === user.address;
                const canCloseGroup = isCreator && !group.closed && !group.threshold;
                const canStartSavings = isCreator && group.closed && !group.locked;
                const canDeposit = group.locked;
                const canWithdraw = group.isUnlocked && group.userBalance > 0;
                
                return (
                  <div key={group.groupId} className="border border-gray-200 rounded-lg p-6">
                    {/* Group Header */}
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-xl font-semibold text-white">{group.name}</h3>
                        <p className="text-sm text-gray-500">Created by: {group.creator.slice(0, 8)}...{group.creator.slice(-4)}</p>
                        {isCreator && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mt-1">
                            Creator
                          </span>
                        )}
                      </div>
                      <div className="text-right">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          group.locked 
                            ? group.isUnlocked 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-yellow-100 text-yellow-800'
                            : group.closed
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-gray-700 text-gray-200'
                        }`}>
                          {group.locked 
                            ? group.isUnlocked 
                              ? 'Completed' 
                              : 'Active'
                            : group.closed
                              ? 'Closed'
                              : 'Open'
                          }
                        </span>
                      </div>
                    </div>

                    {/* Group Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Your Balance</p>
                        <p className="text-lg font-semibold text-white">{group.userBalance.toFixed(6)} STX</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Lock Duration</p>
                        <p className="text-sm text-white">{getLockDurationLabel(group.duration)}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Members</p>
                        <p className="text-sm text-white">
                          {group.memberCount}
                          {group.threshold ? ` / ${group.threshold}` : ' (unlimited)'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Time Remaining</p>
                        <p className="text-sm text-white">{formatTimeRemaining(group.remainingBlocks)}</p>
                      </div>
                    </div>

                    {/* Progress Bar for Groups with Threshold */}
                    {group.threshold && (
                      <div className="mb-6">
                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                          <span>Member Progress</span>
                          <span>{group.memberCount} / {group.threshold}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${(group.memberCount / group.threshold) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="space-y-4">
                      {/* Close Group Button (Creator Only for Unlimited Groups) */}
                      {canCloseGroup && (
                        <div className="bg-gradient-to-r from-orange-50 to-yellow-50 border-2 border-orange-300 rounded-lg p-5 shadow-md">
                          <div className="flex items-start">
                            <div className="flex-shrink-0">
                              <span className="text-3xl">🚪</span>
                            </div>
                            <div className="ml-4 flex-1">
                              <h4 className="text-base font-bold text-orange-900 mb-2">Step 1: Close Group to New Members</h4>
                              <p className="text-sm text-orange-800 mb-3 leading-relaxed">
                                <strong>As the creator</strong>, you can close this group to prevent new members from joining.
                                <br />
                                <strong>What happens when you close:</strong>
                              </p>
                              <ul className="text-sm text-orange-800 mb-4 space-y-1 ml-4">
                                <li>✓ No new members can join</li>
                                <li>✓ Current members remain in the group</li>
                                <li>✓ You can then start the savings period</li>
                              </ul>
                              <button
                                onClick={() => handleCloseGroup(group.groupId)}
                                disabled={actionLoading[`close-${group.groupId}`]}
                                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-lg text-base font-bold text-white bg-gradient-to-r from-orange-600 to-yellow-600 hover:from-orange-700 hover:to-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105"
                              >
                                {actionLoading[`close-${group.groupId}`] ? (
                                  <div className="flex items-center">
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                                    Closing Group...
                                  </div>
                                ) : (
                                  <>
                                    <span className="mr-2">🚪</span>
                                    Close Group to New Members
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Start Savings Button (Creator Only for Closed Groups) */}
                      {canStartSavings && (
                        <div className="bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-300 rounded-lg p-5 shadow-md">
                          <div className="flex items-start">
                            <div className="flex-shrink-0">
                              <span className="text-3xl">🚀</span>
                            </div>
                            <div className="ml-4 flex-1">
                              <h4 className="text-base font-bold text-green-900 mb-2">Step 2: Start Savings Period</h4>
                              <p className="text-sm text-green-800 mb-3 leading-relaxed">
                                <strong>Group is closed!</strong> Now you can start the savings period.
                                <br />
                                <strong>What happens when you start:</strong>
                              </p>
                              <ul className="text-sm text-green-800 mb-4 space-y-1 ml-4">
                                <li>✓ Lock period of <strong>{getLockDurationLabel(group.duration)}</strong> begins</li>
                                <li>✓ All members can deposit funds</li>
                                <li>✓ Funds will be locked until the period expires</li>
                                <li>✓ Countdown timer starts now</li>
                              </ul>
                              <button
                                onClick={() => handleStartLock(group.groupId)}
                                disabled={actionLoading[`start-lock-${group.groupId}`]}
                                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-lg text-base font-bold text-white bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105"
                              >
                                {actionLoading[`start-lock-${group.groupId}`] ? (
                                  <div className="flex items-center">
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                                    Starting Savings Period...
                                  </div>
                                ) : (
                                  <>
                                    <span className="mr-2">🚀</span>
                                    Start Savings Period Now
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Deposit Section - Members can always deposit, even when locked */}
                      {group.isMember && (
                        <div className="bg-gray-800 rounded-lg p-4">
                          <h4 className="text-sm font-medium text-white mb-3">
                            Add to Your Savings
                            {!group.locked && (
                              <span className="ml-2 text-xs text-blue-600">(Group not started yet)</span>
                            )}
                          </h4>
                          <div className="flex space-x-3">
                            <input
                              type="number"
                              step="0.000001"
                              min="0"
                              value={depositAmounts[group.groupId] || ''}
                              onChange={(e) => setDepositAmounts(prev => ({ ...prev, [group.groupId]: e.target.value }))}
                              placeholder="Amount in STX"
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                            <button
                              onClick={() => handleDeposit(group.groupId)}
                              disabled={actionLoading[`deposit-${group.groupId}`] || !depositAmounts[group.groupId]}
                              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {actionLoading[`deposit-${group.groupId}`] ? 'Depositing...' : 'Deposit'}
                            </button>
                          </div>
                          <p className="text-xs text-gray-500 mt-2">
                            As a member, you can add funds anytime to increase your savings
                          </p>
                        </div>
                      )}

                      {/* Withdraw Section */}
                      {canWithdraw && (
                        <div className="bg-gray-800 rounded-lg p-4">
                          <h4 className="text-sm font-medium text-white mb-3">Withdraw STX</h4>
                          <div className="flex space-x-3">
                            <input
                              type="number"
                              step="0.000001"
                              min="0"
                              max={group.userBalance}
                              value={withdrawAmounts[group.groupId] || ''}
                              onChange={(e) => setWithdrawAmounts(prev => ({ ...prev, [group.groupId]: e.target.value }))}
                              placeholder={`Max: ${group.userBalance.toFixed(6)} STX`}
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                            <button
                              onClick={() => handleWithdraw(group.groupId)}
                              disabled={actionLoading[`withdraw-${group.groupId}`] || !withdrawAmounts[group.groupId]}
                              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {actionLoading[`withdraw-${group.groupId}`] ? 'Withdrawing...' : 'Withdraw'}
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Status Messages */}
                      {!group.closed && !canCloseGroup && (
                        <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                          <div className="flex items-start">
                            <span className="text-xl mr-2">⏳</span>
                            <div>
                              <p className="text-sm font-medium text-blue-800 mb-1">Open for Members</p>
                              <p className="text-sm text-blue-700">
                                {group.threshold 
                                  ? `This group will automatically close when it reaches ${group.threshold} members. Currently at ${group.memberCount}/${group.threshold} members.`
                                  : 'This unlimited group is waiting for the creator to manually close it.'
                                }
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {group.closed && !group.locked && !canStartSavings && (
                        <div className="bg-purple-50 border border-purple-200 rounded-md p-3">
                          <div className="flex items-start">
                            <span className="text-xl mr-2">🚪</span>
                            <div>
                              <p className="text-sm font-medium text-purple-800 mb-1">Group Closed</p>
                              <p className="text-sm text-purple-700">
                                This group is closed to new members. Waiting for the creator to start the savings period.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {group.locked && !group.isUnlocked && (
                        <div className="bg-green-50 border border-green-200 rounded-md p-3">
                          <div className="flex items-start">
                            <span className="text-xl mr-2">✅</span>
                            <div>
                              <p className="text-sm font-medium text-green-800 mb-1">Active Savings Period</p>
                              <p className="text-sm text-green-700">
                                The group is now closed and the lock period is active! You can continue making deposits to build your savings. 
                                All funds will remain locked for {formatTimeRemaining(group.remainingBlocks)}.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {group.isUnlocked && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                          <div className="flex items-start">
                            <span className="text-xl mr-2">🎉</span>
                            <div>
                              <p className="text-sm font-medium text-yellow-800 mb-1">Lock Period Completed</p>
                              <p className="text-sm text-yellow-700">
                                The savings period has ended! You can now withdraw your contributions at any time.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}