/**
 * Withdraw Page - STX withdrawal interface for multiple deposits
 */

'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useWallet } from '@/contexts/wallet-context';
import { useMultipleDeposits, type DepositInfo } from '@/hooks/use-multiple-deposits';
import { convertOptionToLabel } from '@/lib/lock-options';

export default function WithdrawPage() {
  const { user, isConnected } = useWallet();
  const hookResult = useMultipleDeposits();
  
  const { 
    getAllUserDeposits, 
    withdrawDeposit, 
    getTotalBalance,
    error: hookError 
  } = hookResult || {};
  
  const [deposits, setDeposits] = useState<DepositInfo[]>([]);
  const [totalBalance, setTotalBalance] = useState<number>(0);
  const [currentBlock, setCurrentBlock] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true); // Start as true to prevent flash
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [actionLoading, setActionLoading] = useState<{ [key: string]: boolean }>({});
  const isFetchingRef = useRef(false);
  
  // Form states for withdrawal
  const [withdrawAmounts, setWithdrawAmounts] = useState<{ [key: number]: string }>({});
  const [showWithdrawForm, setShowWithdrawForm] = useState<{ [key: number]: boolean }>({});
  
  // Refresh trigger for manual refreshes
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  // Calculate statistics with memoization to prevent unnecessary re-renders
  // MUST be before any conditional returns to follow Rules of Hooks
  const unlockedDeposits = useMemo(() => 
    deposits.filter(d => d && !d.isLocked && !d.withdrawn), 
    [deposits]
  );
  const lockedDeposits = useMemo(() => 
    deposits.filter(d => d && d.isLocked && !d.withdrawn), 
    [deposits]
  );
  const withdrawnDeposits = useMemo(() => 
    deposits.filter(d => d && d.withdrawn), 
    [deposits]
  );
  
  // Safety check for hook initialization - AFTER all hooks
  if (!hookResult) {
    console.error('❌ useMultipleDeposits hook not initialized');
    return (
      <div className="min-h-screen bg-gray-900 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-white mb-2">Loading...</h1>
            <p className="text-lg text-gray-600">Initializing wallet connection...</p>
          </div>
        </div>
      </div>
    );
  }



  // Load user's deposits
  useEffect(() => {
    const loadDeposits = async () => {
      // Don't proceed if wallet is not connected or user address is not available
      if (!isConnected || !user?.address) {
        console.log('⚠️ Wallet not connected or no user address');
        setDeposits([]);
        setTotalBalance(0);
        setCurrentBlock(0);
        setIsLoading(false);
        isFetchingRef.current = false;
        return;
      }

      // Prevent concurrent fetches
      if (isFetchingRef.current) {
        console.log('⚠️ Withdraw Page: Already fetching, skipping...');
        return;
      }

      console.log('🔄 Loading deposits for user:', user.address);
      isFetchingRef.current = true;
      setIsLoading(true);
      setError('');
      
      try {
        // Safety checks for hook functions
        if (!getAllUserDeposits || !getTotalBalance) {
          throw new Error('Hook functions not available');
        }
        
        const { getCurrentBlockHeight, getUserDeposit, isUserLocked, getRemainingLockBlocks } = await import('@/lib/contract');
        
        console.log('📡 Calling contract functions...');
        // Force fresh fetch on initial load
        const [userDeposits, balance, blockHeight] = await Promise.all([
          getAllUserDeposits(true), // Force refresh on initial load
          getTotalBalance(),
          getCurrentBlockHeight(),
        ]);
        
        // Ensure userDeposits is always an array
        let safeUserDeposits = Array.isArray(userDeposits) ? userDeposits : [];
        
        console.log('📊 Withdraw Page - Loaded Data:', {
          depositsCount: safeUserDeposits.length,
          deposits: safeUserDeposits,
          balance,
          blockHeight,
          user: user?.address,
        });
        
        // Check for legacy deposit if no multiple deposits found
        if (safeUserDeposits.length === 0) {
          console.log('⚠️ No multiple deposits found, checking for legacy deposit...');
          try {
            const legacyDeposit = await getUserDeposit(user.address);
            if (legacyDeposit && legacyDeposit.amount > 0) {
              console.log('✅ Found legacy deposit:', legacyDeposit);
              const isLocked = await isUserLocked(user.address);
              const remainingBlocks = await getRemainingLockBlocks(user.address);
              
              // Convert legacy deposit to DepositInfo format
              const legacyDepositInfo: DepositInfo = {
                depositId: 0, // Legacy deposit has ID 0
                amount: legacyDeposit.amount,
                depositBlock: legacyDeposit.depositBlock,
                lockExpiry: legacyDeposit.lockExpiry || 0,
                lockOption: legacyDeposit.lockOption || 0,
                withdrawn: false,
                isLocked: isLocked,
                remainingBlocks: remainingBlocks,
                name: 'Legacy Deposit',
              };
              
              safeUserDeposits = [legacyDepositInfo];
              console.log('📦 Added legacy deposit to list');
            } else {
              console.log('⚠️ NO DEPOSITS FOUND (neither multiple nor legacy)');
            }
          } catch (legacyErr) {
            console.error('❌ Error checking legacy deposit:', legacyErr);
          }
        }
        
        // Sort deposits: unlocked first, then by remaining time
        const sortedDeposits = safeUserDeposits.sort((a, b) => {
          if (!a || !b) return 0;
          if (a.withdrawn !== b.withdrawn) return a.withdrawn ? 1 : -1;
          if (a.isLocked !== b.isLocked) return a.isLocked ? 1 : -1;
          return a.remainingBlocks - b.remainingBlocks;
        });
        
        console.log('📊 Withdraw Page - After Sorting:', {
          sortedCount: sortedDeposits.length,
          unlocked: sortedDeposits.filter(d => d && !d.isLocked && !d.withdrawn).length,
          locked: sortedDeposits.filter(d => d && d.isLocked && !d.withdrawn).length,
          withdrawn: sortedDeposits.filter(d => d && d.withdrawn).length
        });
        
        if (sortedDeposits.length > 0) {
          const unlockedCount = sortedDeposits.filter(d => d && !d.isLocked && !d.withdrawn).length;
          if (unlockedCount > 0) {
            console.log(`✅ Found ${unlockedCount} UNLOCKED deposits ready for withdrawal!`);
          }
        }
        
        setDeposits(sortedDeposits);
        setTotalBalance(balance);
        setCurrentBlock(blockHeight);
        
        console.log('✅ State updated successfully');
      } catch (err) {
        console.error('❌ Error loading deposits:', err);
        setError(`Failed to load your deposits: ${err instanceof Error ? err.message : 'Unknown error'}`);
        setDeposits([]);
      } finally {
        setIsLoading(false);
        isFetchingRef.current = false;
        console.log('🏁 Loading complete');
      }
    };

    // Only load deposits when wallet is connected and user address is available
    if (isConnected && user?.address) {
      console.log('✅ Withdraw Page: Wallet connected, loading deposits immediately');
      loadDeposits();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, user?.address, refreshTrigger]); // Hook functions are now stable (use refs), intentionally excluded

  // Set up polling to refresh deposits every 15 seconds when user is connected
  // Increased from 5s to 15s to reduce flickering and API load
  useEffect(() => {
    if (!isConnected || !user?.address) return;

    console.log('📊 Withdraw Page: Setting up auto-refresh polling (15s interval)');
    const intervalId = setInterval(async () => {
      console.log('📊 Withdraw Page: Auto-refreshing deposits...');
      
      // Prevent concurrent fetches
      if (isFetchingRef.current) {
        console.log('📊 Withdraw Page: Already fetching, skipping auto-refresh...');
        return;
      }

      isFetchingRef.current = true;
      
      try {
        const { getCurrentBlockHeight, getUserDeposit, isUserLocked, getRemainingLockBlocks } = await import('@/lib/contract');
        
        // Use forceRefresh=false to allow caching in the hook
        const [userDeposits, balance, blockHeight] = await Promise.all([
          getAllUserDeposits(false), // Use cache if available
          getTotalBalance(),
          getCurrentBlockHeight(),
        ]);
        
        let safeUserDeposits = Array.isArray(userDeposits) ? userDeposits : [];
        
        // Check for legacy deposit if no multiple deposits found
        if (safeUserDeposits.length === 0 && user?.address) {
          try {
            const legacyDeposit = await getUserDeposit(user.address);
            if (legacyDeposit && legacyDeposit.amount > 0) {
              const isLocked = await isUserLocked(user.address);
              const remainingBlocks = await getRemainingLockBlocks(user.address);
              
              const legacyDepositInfo: DepositInfo = {
                depositId: 0,
                amount: legacyDeposit.amount,
                depositBlock: legacyDeposit.depositBlock,
                lockExpiry: legacyDeposit.lockExpiry || 0,
                lockOption: legacyDeposit.lockOption || 0,
                withdrawn: false,
                isLocked: isLocked,
                remainingBlocks: remainingBlocks,
                name: 'Legacy Deposit',
              };
              
              safeUserDeposits = [legacyDepositInfo];
            }
          } catch (legacyErr) {
            console.error('❌ Error checking legacy deposit:', legacyErr);
          }
        }
        
        const sortedDeposits = safeUserDeposits.sort((a, b) => {
          if (!a || !b) return 0;
          if (a.withdrawn !== b.withdrawn) return a.withdrawn ? 1 : -1;
          if (a.isLocked !== b.isLocked) return a.isLocked ? 1 : -1;
          return a.remainingBlocks - b.remainingBlocks;
        });
        
        console.log('📊 Withdraw Page: Auto-refresh loaded', sortedDeposits.length, 'deposits');
        
        setDeposits(sortedDeposits);
        setTotalBalance(balance);
        setCurrentBlock(blockHeight);
      } catch (err) {
        console.error('❌ Withdraw Page: Auto-refresh error:', err);
      } finally {
        isFetchingRef.current = false;
      }
    }, 15000); // Refresh every 15 seconds (increased from 5s)

    return () => {
      console.log('📊 Withdraw Page: Cleaning up auto-refresh polling');
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
      console.log('🔄 Initiating withdrawal:', { depositId, amount: parseFloat(amount) });
      
      // Check if this is a legacy deposit (ID 0)
      if (depositId === 0) {
        console.log('📦 Using legacy withdrawal method');
        const { createWithdrawTransaction } = await import('@/lib/transaction-builder');
        
        await createWithdrawTransaction({
          amount: parseFloat(amount),
          userAddress: user!.address,
          onFinish: (data) => {
            console.log('✅ Legacy withdrawal transaction submitted:', data.txId);
            setSuccess(`Withdrawal successful! Transaction ID: ${data.txId}`);
            setWithdrawAmounts(prev => ({ ...prev, [depositId]: '' }));
            setShowWithdrawForm(prev => ({ ...prev, [depositId]: false }));
            
            // Refresh after delay
            setTimeout(() => window.location.reload(), 2000);
          },
          onCancel: () => {
            setError('Transaction was cancelled');
          },
        });
      } else {
        // Use multiple deposits withdrawal
        const txId = await withdrawDeposit({
          depositId,
          amount: parseFloat(amount),
        });

        console.log('✅ Withdrawal transaction submitted:', txId);
        setSuccess(`Withdrawal successful! Transaction ID: ${txId}`);
        setWithdrawAmounts(prev => ({ ...prev, [depositId]: '' }));
        setShowWithdrawForm(prev => ({ ...prev, [depositId]: false }));
        
        // Trigger immediate refresh
        console.log('✅ Withdrawal successful, triggering immediate refresh');
        setRefreshTrigger(prev => prev + 1);
      }
    } catch (err) {
      console.error('❌ Withdrawal error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to withdraw';
      setError(errorMessage);
    } finally {
      setActionLoading(prev => ({ ...prev, [actionKey]: false }));
    }
  };

  const formatTimeRemaining = (blocks: number) => {
    if (blocks <= 0) return 'Unlocked';
    
    const minutes = blocks * 10;
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    return `${minutes}m`;
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gray-900 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-white mb-2">Withdraw STX</h1>
            <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">
              Access your unlocked STX deposits. Connect your wallet to check your withdrawal status.
            </p>
            
            <div className="p-6 bg-gray-800 border border-gray-700 rounded-lg shadow-sm">
              <p className="text-gray-400">Please connect your wallet to view withdrawal options.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Withdraw STX</h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">Access your unlocked deposits</p>
        </div>

        <div className="space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <span className="text-2xl">💰</span>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-purple-800">Total Balance</p>
                  <p className="text-lg font-semibold text-purple-900">{totalBalance.toFixed(6)} STX</p>
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
                  <p className="text-lg font-semibold text-green-900">{unlockedDeposits.length}</p>
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
                  <p className="text-lg font-semibold text-yellow-900">{lockedDeposits.length}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <span className="text-2xl">✅</span>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-200">Withdrawn</p>
                  <p className="text-lg font-semibold text-white">{withdrawnDeposits.length}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="p-8 bg-gray-800 border border-gray-700 rounded-lg shadow-sm text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-400">Loading your deposits...</p>
            </div>
          )}

          {/* Error State */}
          {(error || hookError) && (
            <div className="p-4 bg-red-900/20 border border-red-800 rounded-md">
              <p className="text-red-600 dark:text-red-400">{error || hookError}</p>
            </div>
          )}

          {/* Success State */}
          {success && (
            <div className="p-4 bg-green-900/20 border border-green-800 rounded-md">
              <p className="text-green-600 dark:text-green-400">{success}</p>
            </div>
          )}

          {/* No Deposits State */}
          {!isLoading && deposits.length === 0 && (
            <div className="p-8 bg-gray-800 border border-gray-700 rounded-lg shadow-sm text-center">
              <h3 className="text-xl font-semibold text-white mb-2">No Deposits Found</h3>
              <p className="text-gray-400 mb-6">You don&apos;t have any deposits yet. Make a deposit to get started!</p>
              <a
                href="/deposit"
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Make a Deposit
              </a>
            </div>
          )}

          {/* Deposits List */}
          {!isLoading && deposits.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">Your Deposits</h3>

              {deposits.map((deposit) => {
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
                          <p className="text-xs text-gray-400">ID: {deposit.depositId}</p>
                        )}
                      </div>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        deposit.withdrawn 
                          ? 'bg-gray-700 text-gray-200'
                          : deposit.isLocked 
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-green-100 text-green-800'
                      }`}>
                        {deposit.withdrawn ? 'Withdrawn' : deposit.isLocked ? 'Locked' : 'Unlocked'}
                      </span>
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
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Time Remaining</p>
                        <p className="text-sm text-white">{formatTimeRemaining(deposit.remainingBlocks)}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Status</p>
                        <p className="text-sm text-white">
                          {deposit.withdrawn ? 'Completed' : deposit.isLocked ? 'Locked' : 'Ready'}
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
                    {canWithdraw && (
                      <div className="space-y-3">
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
                                className="px-4 py-2 border border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-300 bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Status Messages */}
                    {deposit.withdrawn && (
                      <div className="bg-gray-800 border border-gray-200 rounded-md p-3">
                        <p className="text-sm text-gray-200">
                          <strong>Withdrawn:</strong> This deposit has been fully withdrawn.
                        </p>
                      </div>
                    )}
                    
                    {deposit.isLocked && !deposit.withdrawn && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                        <p className="text-sm text-yellow-800">
                          <strong>Locked:</strong> This deposit is locked for {formatTimeRemaining(deposit.remainingBlocks)}. You can withdraw once the lock period expires.
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
