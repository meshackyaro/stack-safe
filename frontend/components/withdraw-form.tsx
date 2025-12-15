/**
 * Withdraw Form Component
 * Handles STX withdrawals from GrowFundz with time-based lock validation
 * Updated to support the new contract's time-based lock periods
 */

'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@/contexts/wallet-context';
import { getUserDeposit, canWithdraw } from '@/lib/contract';
import { formatRemainingTime, convertOptionToLabel } from '@/lib/lock-options';
import type { DepositInfo } from '@/lib/contract';

interface WithdrawFormProps {
  onWithdrawSuccess?: () => void;
}

export default function WithdrawForm({ onWithdrawSuccess }: WithdrawFormProps) {
  const { user, isConnected } = useWallet();
  const [amount, setAmount] = useState<string>('');
  const [depositInfo, setDepositInfo] = useState<DepositInfo>({ amount: 0, depositBlock: 0 });
  const [currentBlock, setCurrentBlock] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingInfo, setIsLoadingInfo] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  // Fetch user deposit info when component mounts or user changes
  useEffect(() => {
    if (!isConnected || !user) return;

    const fetchDepositInfo = async () => {
      setIsLoadingInfo(true);
      try {
        // Import contract functions dynamically to avoid SSR issues
        const { getCurrentBlockHeight, getLockExpiry, validateContractConfig } = await import('@/lib/contract');
        
        // Validate contract configuration before making calls
        if (!validateContractConfig()) {
          const address = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
          
          if (!address || address === 'DEPLOY_CONTRACT_FIRST') {
            setError('Contract not deployed yet. Please deploy the GrowFundz contract to testnet first.');
          } else {
            setError('Contract configuration is invalid. Please check your environment variables.');
          }
          console.warn('Contract configuration is invalid. Using fallback data.');
          return;
        }
        
        // Fetch all data in parallel
        const [deposit, currentBlockHeight, lockExpiry] = await Promise.all([
          getUserDeposit(user.address),
          getCurrentBlockHeight(),
          getLockExpiry(user.address),
        ]);

        // Calculate lock option from remaining blocks and deposit info
        let lockOption = 0;
        if (lockExpiry > 0 && deposit.depositBlock > 0) {
          const totalLockBlocks = lockExpiry - deposit.depositBlock;
          // Map block counts back to lock options (approximate)
          const lockOptionsMap: Record<number, number> = {
            6: 1, 18: 2, 36: 3, 48: 4, 144: 5, 720: 6, 1008: 7, 
            2016: 8, 4320: 9, 12960: 10, 25920: 11, 38880: 12, 52560: 13,
          };
          lockOption = lockOptionsMap[totalLockBlocks] || 0;
        }

        setDepositInfo({
          ...deposit,
          lockExpiry: lockExpiry || deposit.lockExpiry,
          lockOption,
        });
        setCurrentBlock(currentBlockHeight);
      } catch (err) {
        console.error('Error fetching deposit info:', err);
        // Optionally set an error state here if needed
      } finally {
        setIsLoadingInfo(false);
      }
    };

    fetchDepositInfo();
    
    // Set up polling to update data every 30 seconds
    const interval = setInterval(fetchDepositInfo, 30000);
    
    return () => clearInterval(interval);
  }, [isConnected, user]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isConnected || !user) {
      setError('Please connect your wallet first');
      return;
    }

    const withdrawAmount = parseFloat(amount);
    
    // Validate amount
    if (isNaN(withdrawAmount) || withdrawAmount <= 0) {
      setError('Please enter a valid amount greater than 0');
      return;
    }

    if (withdrawAmount > depositInfo.amount) {
      setError(`Cannot withdraw more than your balance (${depositInfo.amount.toFixed(6)} STX)`);
      return;
    }

    // Check if lock period has passed using the new time-based system
    if (!canWithdraw(depositInfo.lockExpiry || 0, currentBlock)) {
      const blocksRemaining = Math.max(0, (depositInfo.lockExpiry || 0) - currentBlock);
      const timeRemaining = formatRemainingTime(blocksRemaining);
      setError(`Funds are still locked for ${timeRemaining} (${blocksRemaining} blocks)`);
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      // Use the centralized transaction builder
      const { createWithdrawTransaction } = await import('@/lib/transaction-builder');
      
      await createWithdrawTransaction({
        amount: withdrawAmount,
        userAddress: user.address,
        onFinish: (data) => {
          setSuccess(`Withdrawal transaction submitted! TX ID: ${data.txId}`);
          setAmount('');
          onWithdrawSuccess?.();
        },
        onCancel: () => {
          setError('Transaction was cancelled');
        },
      });
    } catch (err) {
      console.error('Withdraw error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to submit withdrawal transaction';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Set max amount to user's balance
  const handleMaxClick = () => {
    setAmount(depositInfo.amount.toString());
  };

  // Don't render if wallet not connected
  if (!isConnected) {
    return (
      <div className="p-6 bg-gray-800 dark:bg-gray-800 border border-gray-700 rounded-lg">
        <h2 className="text-xl font-semibold text-white mb-4">Withdraw STX</h2>
        <p className="text-gray-400">Connect your wallet to make withdrawals</p>
      </div>
    );
  }

  // Show loading state while fetching deposit info
  if (isLoadingInfo) {
    return (
      <div className="p-6 bg-gray-800 border border-gray-700 rounded-lg shadow-sm">
        <h2 className="text-xl font-semibold text-white mb-4">Withdraw STX</h2>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-10 bg-gray-200 rounded mb-4"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  // Calculate lock status using the new time-based system
  const isUnlocked = canWithdraw(depositInfo.lockExpiry || 0, currentBlock);
  const blocksRemaining = Math.max(0, (depositInfo.lockExpiry || 0) - currentBlock);
  const timeRemaining = formatRemainingTime(blocksRemaining);
  const lockDurationLabel = depositInfo.lockOption ? convertOptionToLabel(depositInfo.lockOption) : 'Unknown';

  return (
    <div className="p-6 bg-gray-800 border border-gray-700 rounded-lg shadow-sm">
      <h2 className="text-xl font-semibold text-white mb-4">Withdraw STX</h2>
      
      {/* No Deposit State */}
      {depositInfo.amount === 0 && (
        <div className="p-4 bg-gray-800 dark:bg-gray-800 border border-gray-700 rounded-lg text-center">
          <p className="text-gray-400">No deposits found. Make a deposit first to withdraw funds.</p>
        </div>
      )}

      {/* Locked State */}
      {depositInfo.amount > 0 && !isUnlocked && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h3 className="text-sm font-medium text-yellow-800 mb-2">🔒 Funds Locked</h3>
          <div className="space-y-3">
            <div className="text-center">
              <p className="text-lg font-semibold text-yellow-800">{timeRemaining}</p>
              <p className="text-sm text-yellow-600">until withdrawal is available</p>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-sm text-yellow-700">
                <span>Lock Duration:</span>
                <span className="font-medium">{lockDurationLabel}</span>
              </div>
              <div className="flex justify-between text-sm text-yellow-700">
                <span>Progress:</span>
                <span className="font-medium">{Math.round((1 - blocksRemaining / ((depositInfo.lockExpiry || 0) - depositInfo.depositBlock)) * 100)}% complete</span>
              </div>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="mt-3">
            <div className="w-full bg-yellow-200 rounded-full h-2">
              <div 
                className="bg-yellow-500 h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${Math.max(0, Math.min(100, 
                    ((currentBlock - depositInfo.depositBlock) / ((depositInfo.lockExpiry || 0) - depositInfo.depositBlock)) * 100
                  ))}%`
                }}
              ></div>
            </div>
            <div className="flex justify-between text-xs text-yellow-700 mt-1">
              <span>Deposited</span>
              <span>Unlocks</span>
            </div>
          </div>
        </div>
      )}

      {/* Withdrawal Form - Only show if user has unlocked funds */}
      {depositInfo.amount > 0 && isUnlocked && (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Available Balance */}
          <div className="p-3 bg-green-50 border border-green-200 rounded-md">
            <p className="text-sm text-green-700">
              Available to withdraw: <span className="font-semibold">{depositInfo.amount.toFixed(6)} STX</span>
            </p>
          </div>

          {/* Amount Input */}
          <div>
            <label htmlFor="withdraw-amount" className="block text-sm font-medium text-gray-300 mb-2">
              Amount (STX)
            </label>
            <div className="relative">
              <input
                type="number"
                id="withdraw-amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.000000"
                step="0.000001"
                min="0.000001"
                max={depositInfo.amount}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                disabled={isLoading}
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                <button
                  type="button"
                  onClick={handleMaxClick}
                  className="text-xs text-blue-600 hover:text-blue-800 mr-2"
                  disabled={isLoading}
                >
                  MAX
                </button>
                <span className="text-gray-400 text-sm">STX</span>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading || !amount}
            className="w-full px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Processing...
              </div>
            ) : (
              'Withdraw STX'
            )}
          </button>
        </form>
      )}

      {/* Error Message */}
      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
          <p className="text-sm text-green-600">{success}</p>
        </div>
      )}

      {/* Info Box - User-friendly time-based information */}
      {depositInfo.amount > 0 && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <h4 className="text-sm font-medium text-blue-800 mb-2">Your Deposit Info:</h4>
          <div className="space-y-2 text-sm text-blue-700">
            <div className="flex justify-between">
              <span className="font-medium">Lock Duration:</span>
              <span>{lockDurationLabel}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Status:</span>
              <span className={isUnlocked ? 'text-green-600 font-medium' : 'text-yellow-600 font-medium'}>
                {isUnlocked ? '✓ Ready to withdraw' : `🔒 ${timeRemaining} remaining`}
              </span>
            </div>
            {!isUnlocked && (
              <div className="flex justify-between">
                <span className="font-medium">Progress:</span>
                <span>{Math.round((1 - blocksRemaining / ((depositInfo.lockExpiry || 0) - depositInfo.depositBlock)) * 100)}% complete</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="font-medium">Time Elapsed:</span>
              <span>{formatRemainingTime(currentBlock - depositInfo.depositBlock)}</span>
            </div>
          </div>
          
          {/* Optional technical details */}
          <details className="mt-2">
            <summary className="cursor-pointer text-xs text-gray-400 hover:text-gray-400 select-none">
              Blockchain details
            </summary>
            <div className="mt-1 text-xs text-gray-500 space-y-1">
              <div>Blocks: {currentBlock - depositInfo.depositBlock} / {(depositInfo.lockExpiry || 0) - depositInfo.depositBlock}</div>
            </div>
          </details>
        </div>
      )}
    </div>
  );
}