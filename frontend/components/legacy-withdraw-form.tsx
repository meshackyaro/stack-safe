/**
 * Legacy Withdraw Form Component
 * Handles withdrawals from the old single-deposit system
 * For users who created deposits before the multiple deposit system was implemented
 */

'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@/contexts/wallet-context';
import { getUserDeposit, canWithdraw, getCurrentBlockHeight } from '@/lib/contract';
import { formatRemainingTime } from '@/lib/lock-options';
import { createWithdrawTransaction } from '@/lib/transaction-builder';

export default function LegacyWithdrawForm() {
  const { user, isConnected } = useWallet();
  const [amount, setAmount] = useState<string>('');
  const [depositInfo, setDepositInfo] = useState<{ amount: number; depositBlock: number; lockExpiry?: number }>({ 
    amount: 0, 
    depositBlock: 0 
  });
  const [currentBlock, setCurrentBlock] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingInfo, setIsLoadingInfo] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  // Fetch legacy deposit info
  useEffect(() => {
    if (!isConnected || !user) return;

    const fetchDepositInfo = async () => {
      setIsLoadingInfo(true);
      try {
        console.log('🔍 Fetching legacy deposit for user:', user.address);
        
        const [deposit, blockHeight] = await Promise.all([
          getUserDeposit(user.address),
          getCurrentBlockHeight(),
        ]);

        console.log('📦 Legacy deposit data:', deposit);
        
        setDepositInfo(deposit);
        setCurrentBlock(blockHeight);
        
        if (deposit.amount > 0) {
          console.log('✅ Found legacy deposit:', deposit.amount, 'STX');
        } else {
          console.log('ℹ️ No legacy deposit found');
        }
      } catch (err) {
        console.error('❌ Error fetching legacy deposit:', err);
        setError('Failed to load legacy deposit information');
      } finally {
        setIsLoadingInfo(false);
      }
    };

    fetchDepositInfo();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchDepositInfo, 30000);
    return () => clearInterval(interval);
  }, [isConnected, user]);

  // Handle withdrawal
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

    // Check if lock period has passed
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
      console.log('🔄 Initiating legacy withdrawal:', withdrawAmount, 'STX');
      
      await createWithdrawTransaction({
        amount: withdrawAmount,
        userAddress: user.address,
        onFinish: (data) => {
          console.log('✅ Legacy withdrawal successful:', data.txId);
          setSuccess(`Withdrawal transaction submitted! TX ID: ${data.txId}`);
          setAmount('');
          
          // Refresh deposit info after delay
          setTimeout(async () => {
            try {
              const [deposit, blockHeight] = await Promise.all([
                getUserDeposit(user.address),
                getCurrentBlockHeight(),
              ]);
              setDepositInfo(deposit);
              setCurrentBlock(blockHeight);
            } catch (err) {
              console.error('⚠️ Error refreshing deposit info:', err);
            }
          }, 2000);
        },
        onCancel: () => {
          setError('Transaction was cancelled');
          setIsLoading(false);
        },
      });
    } catch (err) {
      console.error('❌ Legacy withdrawal error:', err);
      setError(err instanceof Error ? err.message : 'Failed to withdraw');
    } finally {
      setIsLoading(false);
    }
  };

  // Don't show if no legacy deposit
  if (!isLoadingInfo && depositInfo.amount === 0) {
    return null;
  }

  const blocksRemaining = Math.max(0, (depositInfo.lockExpiry || 0) - currentBlock);
  const isUnlocked = canWithdraw(depositInfo.lockExpiry || 0, currentBlock);

  return (
    <div className="p-6 bg-gray-800 border border-gray-700 rounded-lg shadow-sm">
      <h3 className="text-lg font-semibold text-white mb-4">Legacy Deposit</h3>
      
      {isLoadingInfo ? (
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-400 mt-2">Loading legacy deposit...</p>
        </div>
      ) : (
        <>
          <div className="mb-4 p-4 bg-blue-900/20 border border-blue-800 rounded-lg">
            <p className="text-sm text-blue-200 mb-2">
              You have a deposit from the old single-deposit system.
            </p>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-400">Balance:</p>
                <p className="text-white font-semibold">{depositInfo.amount.toFixed(6)} STX</p>
              </div>
              <div>
                <p className="text-gray-400">Status:</p>
                <p className={`font-semibold ${isUnlocked ? 'text-green-400' : 'text-yellow-400'}`}>
                  {isUnlocked ? 'Unlocked' : `Locked (${formatRemainingTime(blocksRemaining)})`}
                </p>
              </div>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-900/20 border border-red-800 rounded-md">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-green-900/20 border border-green-800 rounded-md">
              <p className="text-green-400 text-sm">{success}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="legacy-amount" className="block text-sm font-medium text-gray-300 mb-2">
                Withdrawal Amount (STX)
              </label>
              <input
                id="legacy-amount"
                type="number"
                step="0.000001"
                min="0"
                max={depositInfo.amount}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={`Max: ${depositInfo.amount.toFixed(6)} STX`}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={!isUnlocked || isLoading}
              />
            </div>

            <button
              type="submit"
              disabled={!isUnlocked || isLoading || !amount}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Processing...' : 'Withdraw from Legacy Deposit'}
            </button>
          </form>
        </>
      )}
    </div>
  );
}
