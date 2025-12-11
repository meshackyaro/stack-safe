/**
 * Deposits Dashboard Component
 * Displays and manages multiple independent deposits with different lock periods
 */

'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useWallet } from '@/contexts/wallet-context';
import { useMultipleDeposits, type DepositInfo } from '@/hooks/use-multiple-deposits';
import { getLockDurationOptions, convertOptionToLabel, formatRemainingTime } from '@/lib/lock-options';

interface DepositsDashboardProps {
  onCreateDeposit?: () => void;
  refreshTrigger?: number;
}

export default function DepositsDashboard({ onCreateDeposit, refreshTrigger }: DepositsDashboardProps) {
  const { user, isConnected } = useWallet();
  const { 
    getAllUserDeposits, 
    withdrawDeposit, 
    getTotalBalance,
    getActiveDepositCount,
    error: hookError 
  } = useMultipleDeposits();
  
  const [deposits, setDeposits] = useState<DepositInfo[]>([]);
  const [totalBalance, setTotalBalance] = useState<number>(0);
  const [activeCount, setActiveCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [actionLoading, setActionLoading] = useState<{ [key: string]: boolean }>({});
  const isFetchingRef = useRef(false);
  
  // Form states for withdrawal
  const [withdrawAmounts, setWithdrawAmounts] = useState<{ [key: number]: string }>({});
  const [showWithdrawForm, setShowWithdrawForm] = useState<{ [key: number]: boolean }>({});

  // Get lock duration options for display
  const lockOptions = getLockDurationOptions();

  // Load deposits immediately when user connects or refresh is triggered
  useEffect(() => {
    const loadDeposits = async () => {
      if (!isConnected || !user?.address) {
        console.log('📊 Dashboard: No user, clearing deposits');
        setDeposits([]);
        setTotalBalance(0);
        setActiveCount(0);
        setIsLoading(false);
        isFetchingRef.current = false;
        return;
      }

      // Prevent concurrent fetches
      if (isFetchingRef.current) {
        console.log('📊 Dashboard: Already fetching, skipping...');
        return;
      }

      console.log('📊 Dashboard: Loading deposits for user:', user.address);
      isFetchingRef.current = true;
      setIsLoading(true);
      setError('');
      
      try {
        // Force fresh fetch on initial load
        const [userDeposits, balance, count] = await Promise.all([
          getAllUserDeposits(true), // Force refresh on initial load
          getTotalBalance(),
          getActiveDepositCount(),
        ]);
        
        console.log('📊 Dashboard: Loaded', userDeposits.length, 'deposits, balance:', balance);
        
        // Sort deposits by creation time (newest first)
        const sortedDeposits = userDeposits.sort((a, b) => b.depositBlock - a.depositBlock);
        
        setDeposits(sortedDeposits);
        setTotalBalance(balance);
        setActiveCount(count);
      } catch (err) {
        console.error('❌ Dashboard: Error loading deposits:', err);
        setError('Failed to load your deposits');
      } finally {
        setIsLoading(false);
        isFetchingRef.current = false;
      }
    };

    if (isConnected && user?.address) {
      console.log('📊 Dashboard: User connected, loading deposits immediately');
      loadDeposits();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, user?.address, refreshTrigger]); // Hook functions are now stable (use refs), intentionally excluded

  // Set up polling to refresh deposits every 15 seconds when user is connected
  // Increased from 5s to 15s to reduce flickering and API load
  useEffect(() => {
    if (!isConnected || !user?.address) return;

    console.log('📊 Dashboard: Setting up auto-refresh polling (15s interval)');
    const intervalId = setInterval(async () => {
      console.log('📊 Dashboard: Auto-refreshing deposits...');
      
      // Prevent concurrent fetches
      if (isFetchingRef.current) {
        console.log('📊 Dashboard: Already fetching, skipping auto-refresh...');
        return;
      }

      isFetchingRef.current = true;
      
      try {
        // Use forceRefresh=false to allow caching in the hook
        const [userDeposits, balance, count] = await Promise.all([
          getAllUserDeposits(false), // Use cache if available
          getTotalBalance(),
          getActiveDepositCount(),
        ]);
        
        console.log('📊 Dashboard: Auto-refresh loaded', userDeposits.length, 'deposits');
        
        const sortedDeposits = userDeposits.sort((a, b) => b.depositBlock - a.depositBlock);
        
        setDeposits(sortedDeposits);
        setTotalBalance(balance);
        setActiveCount(count);
      } catch (err) {
        console.error('❌ Dashboard: Auto-refresh error:', err);
      } finally {
        isFetchingRef.current = false;
      }
    }, 15000); // Refresh every 15 seconds (increased from 5s)

    return () => {
      console.log('📊 Dashboard: Cleaning up auto-refresh polling');
      clearInterval(intervalId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, user?.address]); // Hook functions are now stable (use refs), intentionally excluded

  // Handle withdrawal
  const handleWithdraw = async (depositId: number) => {
    const amount = withdrawAmounts[depositId];
    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid withdrawal amount');
      return;
    }

    const actionKey = `withdraw-${depositId}`;
    setActionLoading(prev => ({ ...prev, [actionKey]: true }));
    setError('');
    setSuccess('');

    try {
      const txId = await withdrawDeposit({
        depositId,
        amount: parseFloat(amount),
      });

      setSuccess(`Withdrawal successful! Transaction ID: ${txId}`);
      setWithdrawAmounts(prev => ({ ...prev, [depositId]: '' }));
      setShowWithdrawForm(prev => ({ ...prev, [depositId]: false }));
      
      // Refresh deposits data
      const [userDeposits, balance, count] = await Promise.all([
        getAllUserDeposits(),
        getTotalBalance(),
        getActiveDepositCount(),
      ]);
      
      const sortedDeposits = userDeposits.sort((a, b) => b.depositBlock - a.depositBlock);
      setDeposits(sortedDeposits);
      setTotalBalance(balance);
      setActiveCount(count);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to withdraw';
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

  // Get deposit status
  const getDepositStatus = (deposit: DepositInfo) => {
    if (deposit.withdrawn) {
      return { status: 'Withdrawn', color: 'gray', description: 'Funds have been withdrawn' };
    }
    if (!deposit.isLocked) {
      return { status: 'Unlocked', color: 'green', description: 'Ready to withdraw' };
    }
    return { status: 'Locked', color: 'yellow', description: `Locked for ${formatTimeRemaining(deposit.remainingBlocks)}` };
  };

  // Calculate unlock date
  const getUnlockDate = (deposit: DepositInfo) => {
    if (deposit.withdrawn || !deposit.isLocked) return null;
    
    // Approximate calculation based on 10-minute blocks
    const minutesRemaining = deposit.remainingBlocks * 10;
    const unlockDate = new Date(Date.now() + (minutesRemaining * 60 * 1000));
    
    return unlockDate.toLocaleString();
  };

  if (!isConnected) {
    return (
      <div className="bg-gray-800 rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-white mb-6">My Deposits</h2>
        <div className="text-center py-8">
          <p className="text-gray-500">Please connect your wallet to view your deposits</p>
        </div>
      </div>
    );
  }

  // Calculate statistics with memoization to prevent unnecessary re-renders
  const lockedDeposits = useMemo(() => 
    deposits.filter(d => d.isLocked && !d.withdrawn).length, 
    [deposits]
  );
  const unlockedDeposits = useMemo(() => 
    deposits.filter(d => !d.isLocked && !d.withdrawn).length, 
    [deposits]
  );
  const withdrawnDeposits = useMemo(() => 
    deposits.filter(d => d.withdrawn).length, 
    [deposits]
  );

  return (
    <div className="space-y-6">
      {/* Header with Total Balance */}
      <div className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-lg shadow-lg p-6 text-white">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm text-purple-100">Total Active Balance</p>
            <p className="text-3xl font-bold text-white">{totalBalance.toFixed(6)} STX</p>
            <p className="text-sm text-purple-200 mt-1">
              {activeCount} active deposit{activeCount !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="text-right">
            <div className="text-4xl mb-2">💎</div>
            <p className="text-sm text-purple-200">Multiple Deposits</p>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <span className="text-2xl">📊</span>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-blue-800">Total Deposits</p>
              <p className="text-lg font-semibold text-blue-900">{deposits.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-yellow-50 rounded-lg p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <span className="text-2xl">🔒</span>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-yellow-800">Locked</p>
              <p className="text-lg font-semibold text-yellow-900">{lockedDeposits}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-green-50 rounded-lg p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <span className="text-2xl">🔓</span>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-green-800">Unlocked</p>
              <p className="text-lg font-semibold text-green-900">{unlockedDeposits}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <span className="text-2xl">💸</span>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-200">Withdrawn</p>
              <p className="text-lg font-semibold text-white">{withdrawnDeposits}</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          <span className="ml-2 text-gray-400">Loading your deposits...</span>
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

      {/* Deposits List */}
      {!isLoading && (
        <>
          {deposits.length === 0 ? (
            <div className="text-center py-8 bg-gray-800 rounded-lg">
              <div className="text-gray-500 mb-4">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-white mb-2">No Deposits Yet</h3>
              <p className="text-gray-500 mb-6">Make a deposit to start saving with time-locked security and organized goal tracking!</p>
              
              {onCreateDeposit && (
                <button
                  onClick={onCreateDeposit}
                  className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                >
                  <span className="mr-2">💎</span>
                  Make a Deposit
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-white">Your Deposits</h3>
                {onCreateDeposit && (
                  <button
                    onClick={onCreateDeposit}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                  >
                    <span className="mr-2">➕</span>
                    New Deposit
                  </button>
                )}
              </div>

              {deposits.map((deposit) => {
                const statusInfo = getDepositStatus(deposit);
                const unlockDate = getUnlockDate(deposit);
                const canWithdraw = !deposit.isLocked && !deposit.withdrawn;
                
                return (
                  <div key={deposit.depositId} className="border border-gray-700 rounded-lg p-6 bg-gray-800">
                    {/* Deposit Header */}
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h4 className="text-lg font-semibold text-white">
                          {deposit.name || `Deposit #${deposit.depositId}`}
                        </h4>
                        {deposit.name && (
                          <p className="text-xs text-gray-400">
                            ID: {deposit.depositId}
                          </p>
                        )}
                        <p className="text-sm text-gray-500">
                          Created at block {deposit.depositBlock}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-${statusInfo.color}-100 text-${statusInfo.color}-800`}>
                          {statusInfo.status}
                        </span>
                        {deposit.name && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            <span className="mr-1">🏷️</span>
                            Named
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Deposit Details */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Amount</p>
                        <p className="text-lg font-semibold text-white">{deposit.amount.toFixed(6)} STX</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Lock Duration</p>
                        <p className="text-sm text-white">{convertOptionToLabel(deposit.lockOption)}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                          {deposit.isLocked ? 'Time Remaining' : 'Status'}
                        </p>
                        <p className="text-sm text-white">
                          {deposit.isLocked ? formatTimeRemaining(deposit.remainingBlocks) : 'Ready to withdraw'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                          {unlockDate ? 'Unlocks At' : 'Available'}
                        </p>
                        <p className="text-sm text-white">
                          {unlockDate || 'Now'}
                        </p>
                      </div>
                    </div>

                    {/* Progress Bar for Locked Deposits */}
                    {deposit.isLocked && !deposit.withdrawn && (
                      <div className="mb-4">
                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                          <span>Lock Progress</span>
                          <span>{deposit.remainingBlocks} blocks remaining</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-yellow-500 h-2 rounded-full transition-all duration-300"
                            style={{
                              width: `${Math.max(0, Math.min(100, 
                                ((deposit.lockExpiry - deposit.depositBlock - deposit.remainingBlocks) / 
                                 (deposit.lockExpiry - deposit.depositBlock)) * 100
                              ))}%`
                            }}
                          ></div>
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="space-y-3">
                      {/* Withdraw Section */}
                      {canWithdraw && (
                        <>
                          {!showWithdrawForm[deposit.depositId] ? (
                            <button
                              onClick={() => setShowWithdrawForm(prev => ({ ...prev, [deposit.depositId]: true }))}
                              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                            >
                              Withdraw Funds
                            </button>
                          ) : (
                            <div className="bg-gray-800 rounded-lg p-4">
                              <h5 className="text-sm font-medium text-white mb-3">Withdraw STX</h5>
                              <div className="flex space-x-3">
                                <input
                                  type="number"
                                  step="0.000001"
                                  min="0"
                                  max={deposit.amount}
                                  value={withdrawAmounts[deposit.depositId] || ''}
                                  onChange={(e) => setWithdrawAmounts(prev => ({ ...prev, [deposit.depositId]: e.target.value }))}
                                  placeholder={`Max: ${deposit.amount.toFixed(6)} STX`}
                                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                />
                                <button
                                  onClick={() => handleWithdraw(deposit.depositId)}
                                  disabled={actionLoading[`withdraw-${deposit.depositId}`] || !withdrawAmounts[deposit.depositId]}
                                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {actionLoading[`withdraw-${deposit.depositId}`] ? 'Withdrawing...' : 'Withdraw'}
                                </button>
                                <button
                                  onClick={() => setShowWithdrawForm(prev => ({ ...prev, [deposit.depositId]: false }))}
                                  className="px-4 py-2 border border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-300 dark:text-gray-200 bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 dark:focus:ring-offset-gray-800"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          )}
                        </>
                      )}

                      {/* Status Messages */}
                      <div className={`p-3 rounded-md ${
                        deposit.withdrawn 
                          ? 'bg-gray-800 border border-gray-200'
                          : deposit.isLocked 
                            ? 'bg-yellow-50 border border-yellow-200'
                            : 'bg-green-50 border border-green-200'
                      }`}>
                        <p className={`text-sm ${
                          deposit.withdrawn 
                            ? 'text-gray-200'
                            : deposit.isLocked 
                              ? 'text-yellow-800'
                              : 'text-green-800'
                        }`}>
                          <strong>{statusInfo.status}:</strong> {statusInfo.description}
                        </p>
                      </div>
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