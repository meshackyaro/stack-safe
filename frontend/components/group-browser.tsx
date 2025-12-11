/**
 * Group Browser Component
 * Displays all available groups with search, filtering, and join functionality
 */

'use client';

import { useState, useEffect, useMemo } from 'react';
import { useWallet } from '@/contexts/wallet-context';
import { useGroupVault } from '@/hooks/use-group-vault';
import { getLockDurationOptions } from '@/lib/lock-options';
import { stxToMicroStx } from '@/lib/stacks-config';

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

interface GroupBrowserProps {
  onGroupJoined?: (groupId: number) => void;
}

export default function GroupBrowser({ onGroupJoined }: GroupBrowserProps) {
  const { user, isConnected } = useWallet();
  const { 
    fetchAllGroupsWithUserData, 
    joinGroupWithDeposit,
    error: hookError 
  } = useGroupVault();
  
  const [allGroups, setAllGroups] = useState<GroupWithUserData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [actionLoading, setActionLoading] = useState<{ [key: string]: boolean }>({});
  
  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'locked' | 'completed'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'members' | 'duration' | 'created'>('name');
  
  // Join form states
  const [joinAmounts, setJoinAmounts] = useState<{ [key: number]: string }>({});
  const [showJoinForm, setShowJoinForm] = useState<{ [key: number]: boolean }>({});

  // Get lock duration options for display
  const lockOptions = getLockDurationOptions();

  // Load all groups
  useEffect(() => {
    const loadGroups = async () => {
      setIsLoading(true);
      try {
        const groups = await fetchAllGroupsWithUserData();
        setAllGroups(groups);
      } catch (err) {
        console.error('Error loading groups:', err);
        setError('Failed to load groups');
      } finally {
        setIsLoading(false);
      }
    };

    loadGroups();
  }, [fetchAllGroupsWithUserData]);

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

  // Filter and sort groups
  const filteredAndSortedGroups = useMemo(() => {
    let filtered = allGroups;

    // Apply search filter (search by group name only - not by ID)
    if (searchTerm) {
      filtered = filtered.filter(group => 
        group.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply status filter
    switch (statusFilter) {
      case 'open':
        filtered = filtered.filter(group => 
          !group.closed && (!group.threshold || group.memberCount < group.threshold)
        );
        break;
      case 'locked':
        filtered = filtered.filter(group => group.locked && !group.isUnlocked);
        break;
      case 'completed':
        filtered = filtered.filter(group => group.isUnlocked);
        break;
      // 'all' shows everything
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'members':
          return b.memberCount - a.memberCount;
        case 'duration':
          return a.duration - b.duration;
        case 'created':
          return a.groupId - b.groupId; // Assuming lower ID = created earlier
        default:
          return 0;
      }
    });

    return filtered;
  }, [allGroups, searchTerm, statusFilter, sortBy]);

  // Handle join with deposit
  const handleJoinWithDeposit = async (groupId: number) => {
    const amount = joinAmounts[groupId];
    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid deposit amount');
      return;
    }

    const actionKey = `join-${groupId}`;
    setActionLoading(prev => ({ ...prev, [actionKey]: true }));
    setError('');
    setSuccess('');

    try {
      const txId = await joinGroupWithDeposit({
        groupId,
        amount: parseFloat(amount),
      });

      setSuccess(`Successfully joined group! Transaction ID: ${txId}`);
      setJoinAmounts(prev => ({ ...prev, [groupId]: '' }));
      setShowJoinForm(prev => ({ ...prev, [groupId]: false }));
      
      // Refresh groups data
      const updatedGroups = await fetchAllGroupsWithUserData();
      setAllGroups(updatedGroups);
      
      if (onGroupJoined) {
        onGroupJoined(groupId);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to join group';
      setError(errorMessage);
    } finally {
      setActionLoading(prev => ({ ...prev, [actionKey]: false }));
    }
  };

  // Format time remaining
  const formatTimeRemaining = (blocks: number) => {
    if (blocks <= 0) return 'Completed';
    
    // Approximate conversion (10 minutes per block)
    const minutes = blocks * 10;
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days} day${days !== 1 ? 's' : ''}`;
    if (hours > 0) return `${hours} hour${hours !== 1 ? 's' : ''}`;
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  };

  // Get group status info
  const getGroupStatus = (group: GroupWithUserData) => {
    if (group.isUnlocked) {
      return { status: 'Completed', color: 'green', description: 'Lock period ended - withdrawals available' };
    }
    if (group.locked) {
      return { status: 'Active', color: 'yellow', description: 'Savings period active - deposits accepted' };
    }
    if (group.closed) {
      return { status: 'Closed', color: 'purple', description: 'Closed to new members - waiting to start' };
    }
    if (group.threshold && group.memberCount >= group.threshold) {
      return { status: 'Full', color: 'red', description: 'Will close automatically when full' };
    }
    return { status: 'Open', color: 'blue', description: 'Accepting new members' };
  };

  if (!isConnected) {
    return (
      <div className="bg-gray-800 rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-white mb-6">Browse Groups</h2>
        <div className="text-center py-8">
          <p className="text-gray-500">Please connect your wallet to browse and join groups</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gray-800 rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-white mb-6">Browse Savings Groups</h2>
        
        {/* Search and Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {/* Search */}
          <div className="md:col-span-2">
            <label htmlFor="search" className="block text-sm font-medium text-gray-300 mb-1">
              Search Groups
            </label>
            <input
              type="text"
              id="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by group name..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          {/* Status Filter */}
          <div>
            <label htmlFor="status-filter" className="block text-sm font-medium text-gray-300 mb-1">
              Status
            </label>
            <select
              id="status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Groups</option>
              <option value="open">Open (Joinable)</option>
              <option value="locked">Active (Locked)</option>
              <option value="completed">Completed</option>
            </select>
          </div>
          
          {/* Sort By */}
          <div>
            <label htmlFor="sort-by" className="block text-sm font-medium text-gray-300 mb-1">
              Sort By
            </label>
            <select
              id="sort-by"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="name">Name</option>
              <option value="members">Member Count</option>
              <option value="duration">Duration</option>
              <option value="created">Recently Created</option>
            </select>
          </div>
        </div>

        {/* Results Summary */}
        <div className="flex justify-between items-center text-sm text-gray-400">
          <span>
            Showing {filteredAndSortedGroups.length} of {allGroups.length} groups
          </span>
          <span>
            {allGroups.filter(g => !g.closed && (!g.threshold || g.memberCount < g.threshold)).length} open for joining
          </span>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-400">Loading groups...</span>
        </div>
      )}

      {/* Error Display */}
      {(error || hookError) && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
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
        <div className="bg-green-50 border border-green-200 rounded-md p-4">
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

      {/* Groups Grid */}
      {!isLoading && (
        <>
          {filteredAndSortedGroups.length === 0 ? (
            <div className="text-center py-8 bg-gray-800 rounded-lg">
              <div className="text-gray-500 mb-4">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-white mb-2">No Groups Found</h3>
              <p className="text-gray-500">
                {searchTerm || statusFilter !== 'all' 
                  ? 'Try adjusting your search or filters'
                  : 'No groups have been created yet. Be the first to create one!'
                }
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAndSortedGroups.map((group) => {
                const statusInfo = getGroupStatus(group);
                const canJoin = !group.isMember && !group.closed && (!group.threshold || group.memberCount < group.threshold);
                const isCreator = user && group.creator === user.address;
                
                return (
                  <div key={group.groupId} className="bg-gray-800 border border-gray-700 rounded-lg p-6 hover:shadow-md transition-shadow">
                    {/* Group Header */}
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-white mb-1">{group.name}</h3>
                        <p className="text-sm text-gray-500">Created by: {group.creator.slice(0, 8)}...{group.creator.slice(-4)}</p>
                        {isCreator && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 mt-1">
                            Creator
                          </span>
                        )}
                        {group.isMember && !isCreator && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 mt-1">
                            Member
                          </span>
                        )}
                      </div>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-${statusInfo.color}-100 text-${statusInfo.color}-800`}>
                        {statusInfo.status}
                      </span>
                    </div>

                    {/* Group Stats */}
                    <div className="space-y-3 mb-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Duration:</span>
                        <span className="font-medium">{getLockDurationLabel(group.duration)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Members:</span>
                        <span className="font-medium">
                          {group.memberCount}
                          {group.threshold ? ` / ${group.threshold}` : ' (unlimited)'}
                        </span>
                      </div>
                      {group.isMember && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Your Balance:</span>
                          <span className="font-medium text-blue-600">{group.userBalance.toFixed(6)} STX</span>
                        </div>
                      )}
                      {group.locked && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Time Remaining:</span>
                          <span className="font-medium">{formatTimeRemaining(group.remainingBlocks)}</span>
                        </div>
                      )}
                    </div>

                    {/* Progress Bar for Groups with Threshold */}
                    {group.threshold && (
                      <div className="mb-4">
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

                    {/* Status Description */}
                    <p className="text-xs text-gray-400 mb-4">{statusInfo.description}</p>

                    {/* Actions */}
                    <div className="space-y-3">
                      {canJoin && (
                        <>
                          {!showJoinForm[group.groupId] ? (
                            <button
                              onClick={() => setShowJoinForm(prev => ({ ...prev, [group.groupId]: true }))}
                              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                              Join Group
                            </button>
                          ) : (
                            <div className="space-y-2">
                              <input
                                type="number"
                                step="0.000001"
                                min="0.000001"
                                value={joinAmounts[group.groupId] || ''}
                                onChange={(e) => setJoinAmounts(prev => ({ ...prev, [group.groupId]: e.target.value }))}
                                placeholder="Initial deposit (STX)"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                              />
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => handleJoinWithDeposit(group.groupId)}
                                  disabled={actionLoading[`join-${group.groupId}`] || !joinAmounts[group.groupId]}
                                  className="flex-1 py-2 px-3 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {actionLoading[`join-${group.groupId}`] ? 'Joining...' : 'Join & Deposit'}
                                </button>
                                <button
                                  onClick={() => setShowJoinForm(prev => ({ ...prev, [group.groupId]: false }))}
                                  className="px-3 py-2 border border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-300 dark:text-gray-200 bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800"
                                >
                                  Cancel
                                </button>
                              </div>
                              <p className="text-xs text-gray-500">
                                You must make an initial deposit to join this group
                              </p>
                            </div>
                          )}
                        </>
                      )}

                      {group.isMember && (
                        <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                          <p className="text-sm text-blue-800">
                            <strong>You&apos;re a member!</strong> Visit your dashboard to manage deposits and withdrawals.
                          </p>
                        </div>
                      )}

                      {!canJoin && !group.isMember && (
                        <div className="bg-gray-800 border border-gray-200 rounded-md p-3">
                          <p className="text-sm text-gray-400">
                            {group.closed 
                              ? 'This group is closed to new members'
                              : 'This group is full'
                            }
                          </p>
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