/**
 * Vault Information Component
 * Displays user's vault balance, deposit info, and time-based lock status
 * Updated to support the new contract's time-based lock periods
 */

'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@/contexts/wallet-context';
import { getUserDeposit, getUserBalance } from '@/lib/contract';
import { formatRemainingTime, convertOptionToLabel, getUnlockTimeDescription } from '@/lib/lock-options';
import { formatRemainingTimeAccurate, getNetworkBlockTime } from '@/lib/network-timing';
import { useMultipleDeposits } from '@/hooks/use-multiple-deposits';
import { useGroupVault } from '@/hooks/use-group-vault';
import type { DepositInfo } from '@/lib/contract';

// Extended deposit info to include lock option and expiry
interface ExtendedDepositInfo extends DepositInfo {
  lockExpiry?: number;
  lockOption?: number;
}

interface VaultInfoProps {
  refreshTrigger?: number;
  onRefresh?: () => void;
}

export default function VaultInfo({ refreshTrigger, onRefresh }: VaultInfoProps = {}) {
  const { user, isConnected } = useWallet();
  const { getTotalBalance, getActiveDepositCount } = useMultipleDeposits();
  const { fetchAllGroupsWithUserData } = useGroupVault();
  
  const [depositInfo, setDepositInfo] = useState<ExtendedDepositInfo>({ 
    amount: 0, 
    depositBlock: 0,
    lockExpiry: 0,
    lockOption: 0
  });
  const [balance, setBalance] = useState<number>(0);
  const [multipleDepositsBalance, setMultipleDepositsBalance] = useState<number>(0);
  const [groupBalance, setGroupBalance] = useState<number>(0);
  const [activeDepositCount, setActiveDepositCount] = useState<number>(0);
  const [groupCount, setGroupCount] = useState<number>(0);
  const [currentBlock, setCurrentBlock] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true); // Start with loading true to fetch data immediately
  const [error, setError] = useState<string>('');
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());



  // Fetch user's vault information when wallet is connected
  useEffect(() => {
    if (!isConnected || !user) return;

    const fetchVaultInfo = async () => {
      setIsLoading(true);
      setError('');
      
      try {
        // Import contract functions dynamically to avoid SSR issues
        const { getCurrentBlockHeight, getLockExpiry, validateContractConfig, verifyContractExists } = await import('@/lib/contract');
        
        // Validate contract configuration before making calls
        if (!validateContractConfig()) {
          const address = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
          const name = process.env.NEXT_PUBLIC_CONTRACT_NAME;
          
          if (!address || address === 'DEPLOY_CONTRACT_FIRST') {
            throw new Error('Contract not deployed yet. Please deploy the GrowFundz contract to testnet first, then update NEXT_PUBLIC_CONTRACT_ADDRESS in .env.local');
          }
          
          throw new Error(`Contract configuration is invalid. Address: ${address || 'MISSING'}, Name: ${name || 'MISSING'}`);
        }
        
        // Verify contract exists on the network
        const contractExists = await verifyContractExists();
        
        // Fetch all data in parallel
        const [deposit, userBalance, currentBlockHeight, lockExpiry, multipleBalance, depositCount, userGroups] = await Promise.all([
          getUserDeposit(user.address),
          getUserBalance(user.address),
          getCurrentBlockHeight(),
          getLockExpiry(user.address),
          getTotalBalance(),
          getActiveDepositCount(),
          fetchAllGroupsWithUserData(),
        ]);

        // Calculate total group balance
        const totalGroupBalance = userGroups
          .filter(g => g.isMember)
          .reduce((sum, group) => sum + group.userBalance, 0);
        const userGroupCount = userGroups.filter(g => g.isMember).length;

        // Calculate lock option from remaining blocks and deposit info
        // This is an approximation since we don't store the original lock option
        let lockOption = 0;
        if (lockExpiry > 0 && deposit.depositBlock > 0) {
          const totalLockBlocks = lockExpiry - deposit.depositBlock;
          // Map block counts back to lock options (approximate)
          const lockOptionsMap: Record<number, number> = {
            6: 1,     // 1 hour
            18: 2,    // 3 hours
            36: 3,    // 6 hours
            48: 4,    // 8 hours
            144: 5,   // 1 day
            720: 6,   // 5 days
            1008: 7,  // 1 week
            2016: 8,  // 2 weeks
            4320: 9,  // 1 month
            12960: 10, // 3 months
            25920: 11, // 6 months
            38880: 12, // 9 months
            52560: 13, // 1 year
          };
          lockOption = lockOptionsMap[totalLockBlocks] || 0;
        }
        
        setDepositInfo({
          ...deposit,
          lockExpiry: lockExpiry || deposit.lockExpiry,
          lockOption,
        });
        setBalance(userBalance);
        setMultipleDepositsBalance(multipleBalance);
        setGroupBalance(totalGroupBalance);
        setActiveDepositCount(depositCount);
        setGroupCount(userGroupCount);
        setCurrentBlock(currentBlockHeight);
        setLastRefresh(new Date());
      } catch (err) {
        const { handleContractError } = await import('@/lib/contract');
        const errorMessage = handleContractError(err);
        setError(errorMessage);
        console.error('❌ Error fetching vault info:', err);
        console.error('❌ Error message:', errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    fetchVaultInfo();
    
    // Set up polling to update data every 30 seconds
    const interval = setInterval(fetchVaultInfo, 30000);
    
    return () => clearInterval(interval);
  }, [isConnected, user?.address, refreshTrigger]); // Use user.address instead of user object

  // Manual refresh function
  const handleManualRefresh = async () => {
    if (!isConnected || !user || isLoading) return;
    
    const fetchVaultInfo = async () => {
      setIsLoading(true);
      setError('');
      
      try {
        const { getCurrentBlockHeight, getLockExpiry, validateContractConfig, verifyContractExists } = await import('@/lib/contract');
        
        if (!validateContractConfig()) {
          const address = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
          const name = process.env.NEXT_PUBLIC_CONTRACT_NAME;
          
          if (!address || address === 'DEPLOY_CONTRACT_FIRST') {
            throw new Error('Contract not deployed yet. Please deploy the GrowFundz contract to testnet first, then update NEXT_PUBLIC_CONTRACT_ADDRESS in .env.local');
          }
          
          throw new Error(`Contract configuration is invalid. Address: ${address || 'MISSING'}, Name: ${name || 'MISSING'}`);
        }
        
        // Verify contract exists
        const contractExists = await verifyContractExists();
        if (!contractExists) {
          console.warn('⚠️ Contract may not exist on the network, but continuing...');
        }
        
        const [deposit, userBalance, currentBlockHeight, lockExpiry, multipleBalance, depositCount, userGroups] = await Promise.all([
          getUserDeposit(user.address),
          getUserBalance(user.address),
          getCurrentBlockHeight(),
          getLockExpiry(user.address),
          getTotalBalance(),
          getActiveDepositCount(),
          fetchAllGroupsWithUserData(),
        ]);

        // Calculate total group balance
        const totalGroupBalance = userGroups
          .filter(g => g.isMember)
          .reduce((sum, group) => sum + group.userBalance, 0);
        const userGroupCount = userGroups.filter(g => g.isMember).length;

        let lockOption = 0;
        if (lockExpiry > 0 && deposit.depositBlock > 0) {
          const totalLockBlocks = lockExpiry - deposit.depositBlock;
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
        setBalance(userBalance);
        setMultipleDepositsBalance(multipleBalance);
        setGroupBalance(totalGroupBalance);
        setActiveDepositCount(depositCount);
        setGroupCount(userGroupCount);
        setCurrentBlock(currentBlockHeight);
        setLastRefresh(new Date());
        
        if (onRefresh) onRefresh();
      } catch (err) {
        const { handleContractError } = await import('@/lib/contract');
        const errorMessage = handleContractError(err);
        setError(errorMessage);
        console.error('❌ Manual refresh error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    await fetchVaultInfo();
  };

  // Don't render if wallet not connected - let the parent handle this
  if (!isConnected || !user) {
    return null;
  }

  // Always show the component structure, even during loading
  const shouldShowContent = true;

  // Show error state
  if (error && !isLoading) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-xl font-semibold text-red-900">Your Vault</h2>
          <button
            onClick={handleManualRefresh}
            className="px-3 py-1 text-sm text-red-600 hover:text-red-800 border border-red-300 rounded-md hover:bg-red-50 transition-colors"
            disabled={isLoading}
          >
            Retry
          </button>
        </div>
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  // Calculate lock status using time-based system
  const blocksRemaining = Math.max(0, (depositInfo.lockExpiry || 0) - currentBlock);
  const isUnlocked = currentBlock >= (depositInfo.lockExpiry || 0);
  const lockDurationLabel = depositInfo.lockOption ? convertOptionToLabel(depositInfo.lockOption) : 'Unknown';
  const remainingTimeText = formatRemainingTime(blocksRemaining);
  
  // Calculate total balance across all systems (legacy + multiple deposits + groups)
  const totalBalance = balance + multipleDepositsBalance + groupBalance;

  return (
    <div className="p-6 bg-gray-800 border border-gray-700 rounded-lg shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-white">Your Vault</h2>
        <div className="flex items-center gap-2">
          {!isLoading && (
            <span className="text-xs text-gray-500">
              Last updated: {lastRefresh.toLocaleTimeString()}
            </span>
          )}
          <div className="flex gap-2">
            <button
              onClick={handleManualRefresh}
              className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800 border border-blue-300 rounded-md hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading}
            >
              {isLoading ? 'Loading...' : 'Refresh'}
            </button>
          </div>
        </div>
      </div>

      {/* Loading State Indicator - Subtle */}
      {isLoading && (
        <div className="mb-4 p-2 bg-blue-50 border-l-4 border-blue-300 rounded-r-lg">
          <div className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
            <span className="text-blue-700 text-xs">Updating vault data...</span>
          </div>
        </div>
      )}
      
      {/* Balance Display - Always visible with immediate data or zeros */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="p-4 bg-blue-50 rounded-lg">
          <h3 className="text-sm font-medium text-blue-800 mb-1">Total Balance</h3>
          <p className="text-2xl font-bold text-blue-900">
            {`${totalBalance.toFixed(6)} STX`}
            {isLoading && <span className="ml-2 text-sm text-blue-600">↻</span>}
          </p>
          <p className="text-xs text-blue-700 mt-1">
            Personal + Group Savings
          </p>
        </div>
        
        <div className="p-4 bg-purple-50 rounded-lg">
          <h3 className="text-sm font-medium text-purple-800 mb-1">Personal Deposits</h3>
          <p className="text-lg font-semibold text-purple-900">
            {`${multipleDepositsBalance.toFixed(6)} STX`}
            {isLoading && <span className="ml-2 text-sm text-purple-600">↻</span>}
          </p>
          <p className="text-xs text-purple-700 mt-1">
            {activeDepositCount} active deposit{activeDepositCount !== 1 ? 's' : ''}
          </p>
        </div>
        
        <div className="p-4 bg-green-50 rounded-lg">
          <h3 className="text-sm font-medium text-green-800 mb-1">Group Savings</h3>
          <p className="text-lg font-semibold text-green-900">
            {`${groupBalance.toFixed(6)} STX`}
            {isLoading && <span className="ml-2 text-sm text-green-600">↻</span>}
          </p>
          <p className="text-xs text-green-700 mt-1">
            {groupCount} group{groupCount !== 1 ? 's' : ''}
          </p>
        </div>

        <div className="p-4 bg-gray-800 rounded-lg">
          <h3 className="text-sm font-medium text-gray-200 mb-1">Legacy Deposit</h3>
          <p className="text-lg font-semibold text-white">
            {`${balance.toFixed(6)} STX`}
            {isLoading && <span className="ml-2 text-sm text-gray-400">↻</span>}
          </p>
          <p className="text-xs text-gray-300 mt-1">
            {depositInfo.lockOption ? lockDurationLabel : 'No legacy deposit'}
          </p>
        </div>
      </div>

      {/* Deposit Status - Always visible */}
      <div className="mb-4">
        {depositInfo.amount > 0 ? (
          <div className={`p-4 rounded-lg ${isUnlocked ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'}`}>
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h3 className={`text-sm font-medium ${isUnlocked ? 'text-green-800' : 'text-yellow-800'}`}>
                  Lock Status
                </h3>
                <p className={`text-lg font-semibold ${isUnlocked ? 'text-green-900' : 'text-yellow-900'}`}>
                  {isUnlocked ? 'Unlocked - Ready to withdraw' : `Locked for ${remainingTimeText}`}
                </p>
                {!isUnlocked && (
                  <p className={`text-xs ${isUnlocked ? 'text-green-700' : 'text-yellow-700'} mt-1`}>
                    Time remaining: {remainingTimeText}
                  </p>
                )}
              </div>
              <div className="flex flex-col items-center">
                <div className={`w-3 h-3 rounded-full ${isUnlocked ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                {!isUnlocked && (
                  <div className="mt-2 text-xs text-gray-500">
                    {Math.round((1 - blocksRemaining / ((depositInfo.lockExpiry || 0) - depositInfo.depositBlock)) * 100)}%
                  </div>
                )}
              </div>
            </div>
            
            {/* Progress Bar for Locked Funds */}
            {!isUnlocked && depositInfo.lockExpiry && depositInfo.depositBlock && (
              <div className="mt-3">
                <div className="w-full bg-yellow-200 rounded-full h-2">
                  <div 
                    className="bg-yellow-500 h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.max(0, Math.min(100, 
                        ((currentBlock - depositInfo.depositBlock) / (depositInfo.lockExpiry - depositInfo.depositBlock)) * 100
                      ))}%`
                    }}
                  ></div>
                </div>
                <div className="flex justify-between text-xs text-yellow-700 mt-1">
                  <span>Deposited</span>
                  <span>Unlocks</span>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="p-4 bg-gray-800 border border-gray-200 rounded-lg text-center">
            <div className="mb-2">
              <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-2">
                <span className="text-2xl">💰</span>
              </div>
            </div>
            <p className="text-gray-400 font-medium">
              No deposits found
              {isLoading && <span className="ml-2 text-sm text-gray-500">↻</span>}
            </p>
            <p className="text-gray-500 text-sm mt-1">Make a deposit to get started!</p>
          </div>
        )}
      </div>

      {/* Vault Details */}
      <div className="border-t pt-4">
        {depositInfo.amount > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-4">
              <div className="space-y-3">
                <div>
                  <p className="font-medium text-gray-300">Lock Duration:</p>
                  <p className="text-white">{lockDurationLabel}</p>
                </div>
                <div>
                  <p className="font-medium text-gray-300">Time Elapsed:</p>
                  <p className="text-white">{formatRemainingTime(currentBlock - depositInfo.depositBlock)}</p>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <p className="font-medium text-gray-300">Status:</p>
                  <p className={`font-medium ${isUnlocked ? 'text-green-600' : 'text-yellow-600'}`}>
                    {isUnlocked ? 'Ready to withdraw' : `Locked for ${remainingTimeText}`}
                  </p>
                </div>
                {!isUnlocked && (
                  <div>
                    <p className="font-medium text-gray-300">Progress:</p>
                    <p className="text-white">
                      {Math.round((1 - blocksRemaining / ((depositInfo.lockExpiry || 0) - depositInfo.depositBlock)) * 100)}% complete
                    </p>
                  </div>
                )}
              </div>
            </div>
            

          </>
        ) : (
          <div className="text-center py-4">
            <p className="text-gray-500 text-sm mb-3">Ready to start saving with GrowFundz?</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-gray-400">
              <div className="p-3 bg-blue-50 rounded">
                <p className="font-medium text-blue-800 mb-1">💡 Quick Start</p>
                <p>Choose an amount and lock period to begin your savings journey</p>
              </div>
              <div className="p-3 bg-green-50 rounded">
                <p className="font-medium text-green-800 mb-1">🔒 Time Lock</p>
                <p>Your funds will be safely locked for your chosen duration</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}