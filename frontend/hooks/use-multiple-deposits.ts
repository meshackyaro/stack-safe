/**
 * Custom hook for Multiple Deposits functionality
 * Handles creating, managing, and withdrawing from multiple independent deposits
 */

'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useStacks } from './use-stacks';
import { 
  uintCV,
  stringAsciiCV,
  someCV,
  noneCV,
  standardPrincipalCV,
  cvToJSON,
} from '@stacks/transactions';
import { openContractCall } from '@stacks/connect';
import { 
  getStacksNetwork, 
  CONTRACT_CONFIG, 
  stxToMicroStx, 
  microStxToStx,
  isContractConfigValid,
  getContractConfigError 
} from '@/lib/stacks-config';
import { 
  callReadOnlyFunction,
  handleContractError,
} from '@/lib/contract';

export interface CreateDepositParams {
  amount: number;
  lockOption: number;
  name?: string;
}

export interface WithdrawDepositParams {
  depositId: number;
  amount: number;
}

export interface DepositInfo {
  depositId: number;
  amount: number;
  depositBlock: number;
  lockExpiry: number;
  lockOption: number;
  withdrawn: boolean;
  isLocked: boolean;
  remainingBlocks: number;
  name?: string;
}

export const useMultipleDeposits = () => {
  const { user, userSession, isConnected } = useStacks();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Store user address in a ref to prevent function recreation
  const userAddressRef = useRef<string | undefined>(user?.address);
  
  // Update ref when user address changes
  useEffect(() => {
    userAddressRef.current = user?.address;
  }, [user?.address]);

  /**
   * Create a new deposit with independent lock period
   * @param params - Deposit creation parameters
   * @returns Promise<string> - Transaction ID
   */
  const createDeposit = useCallback(async (params: CreateDepositParams): Promise<string> => {
    // Pre-flight validation checks
    if (!isConnected || !user) {
      const error = 'Please connect your wallet first';
      setError(error);
      throw new Error(error);
    }

    // Validate contract configuration before attempting transaction
    if (!isContractConfigValid()) {
      const configError = getContractConfigError();
      setError(configError || 'Contract configuration is invalid');
      throw new Error(configError || 'Contract configuration is invalid');
    }

    // Validate amount
    if (!params.amount || params.amount <= 0) {
      const error = 'Invalid deposit amount';
      setError(error);
      throw new Error(error);
    }

    // Validate lock option
    if (!params.lockOption || params.lockOption < 1 || params.lockOption > 13) {
      const error = 'Invalid lock option. Please select a valid lock duration (1-13)';
      setError(error);
      throw new Error(error);
    }

    setIsLoading(true);
    setError(null);

    try {
      const network = getStacksNetwork();
      
      // Validate network configuration
      if (!network) {
        throw new Error('Network configuration is invalid. Please check your environment settings.');
      }

      const amountInMicroStx = stxToMicroStx(params.amount);
      
      // Validate conversion
      if (isNaN(amountInMicroStx) || amountInMicroStx <= 0) {
        throw new Error('Failed to convert STX amount. Please check your input.');
      }

      // Prepare function arguments with proper type validation
      const functionArgs = [
        uintCV(amountInMicroStx),
        uintCV(params.lockOption),
        params.name ? someCV(stringAsciiCV(params.name)) : noneCV(),
      ];

      // Import post-condition mode
      const { PostConditionMode } = await import('@stacks/transactions');

      // Log transaction details for debugging
      console.log('Creating deposit transaction:', {
        network: 'coreApiUrl' in network ? network.coreApiUrl : 'url' in network ? network.url : 'unknown',
        contractAddress: CONTRACT_CONFIG.address,
        contractName: CONTRACT_CONFIG.name,
        functionName: 'create-deposit',
        amount: params.amount,
        amountInMicroStx,
        lockOption: params.lockOption,
        name: params.name,
        userAddress: user.address,
      });

      // Validate all required parameters are present
      if (!CONTRACT_CONFIG.address || !CONTRACT_CONFIG.name) {
        throw new Error('Contract configuration is missing required parameters');
      }

      // Use Stacks Connect to open contract call
      return new Promise((resolve, reject) => {
        try {
          openContractCall({
            network,
            contractAddress: CONTRACT_CONFIG.address,
            contractName: CONTRACT_CONFIG.name,
            functionName: 'create-deposit',
            functionArgs,
            postConditionMode: PostConditionMode.Allow,  // Allow STX transfers
            onFinish: (data) => {
              console.log('Transaction created successfully:', data.txId);
              setError(null);
              resolve(data.txId);
            },
            onCancel: () => {
              const cancelError = 'Transaction cancelled by user';
              console.log(cancelError);
              setError(cancelError);
              reject(new Error(cancelError));
            },
          });
        } catch (txError) {
          console.error('Error generating unsigned stacks transaction:', txError);
          const errorMsg = `Failed to generate transaction: ${txError instanceof Error ? txError.message : 'Unknown error'}. Please ensure your wallet is connected and the contract is deployed.`;
          setError(errorMsg);
          reject(new Error(errorMsg));
        }
      });
    } catch (err) {
      console.error('Create deposit error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to create deposit';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [isConnected, user]);

  /**
   * Withdraw from a specific deposit
   * @param params - Withdrawal parameters
   * @returns Promise<string> - Transaction ID
   */
  const withdrawDeposit = useCallback(async (params: WithdrawDepositParams): Promise<string> => {
    if (!isConnected || !user) {
      throw new Error('Wallet not connected');
    }

    // Validate contract configuration
    if (!isContractConfigValid()) {
      const configError = getContractConfigError();
      throw new Error(configError || 'Contract configuration is invalid');
    }

    setIsLoading(true);
    setError(null);

    try {
      const network = getStacksNetwork();
      const amountInMicroStx = stxToMicroStx(params.amount);
      
      // Prepare function arguments
      const functionArgs = [
        uintCV(params.depositId),
        uintCV(amountInMicroStx),
      ];

      // Import post-condition mode
      const { PostConditionMode } = await import('@stacks/transactions');

      // Use Stacks Connect to open contract call
      return new Promise((resolve, reject) => {
        openContractCall({
          network,
          contractAddress: CONTRACT_CONFIG.address,
          contractName: CONTRACT_CONFIG.name,
          functionName: 'withdraw-deposit',
          functionArgs,
          postConditionMode: PostConditionMode.Allow,  // Allow STX transfers
          onFinish: (data) => {
            resolve(data.txId);
          },
          onCancel: () => {
            reject(new Error('Transaction cancelled by user'));
          },
        });
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to withdraw from deposit';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [isConnected, user]);

  /**
   * Get all deposit IDs for the current user
   * ALWAYS fetches fresh data from the blockchain - no caching
   * @returns Promise<number[]> - Array of deposit IDs
   */
  const getUserDepositIds = useCallback(async (): Promise<number[]> => {
    const currentUserAddress = userAddressRef.current;
    if (!currentUserAddress) {
      console.log('⚠️ getUserDepositIds: No user connected');
      return [];
    }

    try {
      console.log('🔍 Fetching deposit IDs for user:', currentUserAddress, '(fresh from blockchain)');
      
      const result = await callReadOnlyFunction({
        contractAddress: CONTRACT_CONFIG.address,
        contractName: CONTRACT_CONFIG.name,
        functionName: 'get-user-deposit-ids',
        functionArgs: [standardPrincipalCV(currentUserAddress)],
      });

      console.log('📦 Raw Clarity Value from get-user-deposit-ids:', result);
      
      // Parse the Clarity Value using cvToJSON
      const data = cvToJSON(result);
      console.log('📦 Parsed JSON data:', JSON.stringify(data, null, 2));
      
      // Helper to recursively extract value
      const extractValue = (obj: any): any => {
        if (obj === null || obj === undefined) return obj;
        if (typeof obj === 'object' && 'value' in obj) {
          return extractValue(obj.value);
        }
        return obj;
      };
      
      // The contract returns a tuple: { deposit-ids: (list uint) }
      // After cvToJSON, it should be: { type: 'tuple', value: { 'deposit-ids': { type: 'list', value: [...] } } }
      if (data && typeof data === 'object' && 'value' in data) {
        const tupleData = data.value;
        
        if (tupleData && typeof tupleData === 'object' && 'deposit-ids' in tupleData) {
          const depositIdsField = tupleData['deposit-ids'];
          
          // Extract the list value - handle nested value objects
          let depositIdsList = extractValue(depositIdsField);
          
          // If it's still an object with value, extract again
          if (depositIdsList && typeof depositIdsList === 'object' && 'value' in depositIdsList) {
            depositIdsList = depositIdsList.value;
          }
          
          if (Array.isArray(depositIdsList)) {
            if (depositIdsList.length === 0) {
              console.log('📋 Empty deposit list - no deposits created yet');
              return [];
            }
            
            // Each item in the list is a uint CV: { type: 'uint', value: '123' }
            const mappedIds = depositIdsList.map((item: any) => {
              const value = extractValue(item);
              const numValue = Number(value);
              console.log(`  📌 Mapping deposit ID: ${item} -> ${value} -> ${numValue}`);
              return numValue;
            }).filter(id => !isNaN(id) && id > 0); // Filter out invalid IDs
            
            console.log('✅ Found deposit IDs:', mappedIds);
            return mappedIds;
          }
        }
      }

      console.log('⚠️ No deposit IDs found - unexpected data structure');
      return [];
    } catch (err) {
      console.error('❌ Error fetching user deposit IDs:', err);
      return [];
    }
  }, []); // No dependencies - uses ref

  /**
   * Get detailed information for a specific deposit
   * @param depositId - ID of the deposit
   * @returns Promise<DepositInfo | null>
   */
  const getDepositInfo = useCallback(async (depositId: number): Promise<DepositInfo | null> => {
    const currentUserAddress = userAddressRef.current;
    if (!currentUserAddress) {
      console.log(`⚠️ getDepositInfo: No user connected for deposit #${depositId}`);
      return null;
    }

    try {
      console.log(`🔍 Fetching info for deposit #${depositId} for user:`, currentUserAddress);
      
      const [depositResult, isLockedResult, remainingBlocksResult] = await Promise.all([
        callReadOnlyFunction({
          contractAddress: CONTRACT_CONFIG.address,
          contractName: CONTRACT_CONFIG.name,
          functionName: 'get-user-deposit',
          functionArgs: [
            standardPrincipalCV(currentUserAddress),
            uintCV(depositId),
          ],
        }),
        callReadOnlyFunction({
          contractAddress: CONTRACT_CONFIG.address,
          contractName: CONTRACT_CONFIG.name,
          functionName: 'is-deposit-locked',
          functionArgs: [
            standardPrincipalCV(currentUserAddress),
            uintCV(depositId),
          ],
        }),
        callReadOnlyFunction({
          contractAddress: CONTRACT_CONFIG.address,
          contractName: CONTRACT_CONFIG.name,
          functionName: 'get-deposit-remaining-blocks',
          functionArgs: [
            standardPrincipalCV(currentUserAddress),
            uintCV(depositId),
          ],
        }),
      ]);

      const depositData = cvToJSON(depositResult);
      console.log(`📦 Raw depositData for #${depositId}:`, JSON.stringify(depositData, null, 2));
      
      // Check if deposit exists - map-get? returns (optional ...) which becomes null or { value: ... }
      // The contract KEEPS withdrawn deposits in the map, so we should still fetch them
      if (!depositData || depositData.type === 'none' || depositData.value === null) {
        console.log(`⚠️ No data found for deposit #${depositId} - deposit does not exist in contract`);
        return null;
      }

      // For optional types, the actual data is in depositData.value.value
      // Structure: { type: 'some', value: { type: 'tuple', value: { amount: ..., ... } } }
      let data = depositData.value;
      
      // If it's wrapped in another value object (from 'some'), unwrap it
      if (data && typeof data === 'object' && 'value' in data && data.type === 'tuple') {
        data = data.value;
      } else if (data && typeof data === 'object' && 'value' in data) {
        data = data.value;
      }
      
      const isLockedData = cvToJSON(isLockedResult);
      const remainingBlocksData = cvToJSON(remainingBlocksResult);
      
      console.log(`📦 Extracted data for #${depositId}:`, { data, isLockedData, remainingBlocksData });

      // Helper function to safely extract value - recursively unwrap nested value objects
      const extractValue = (obj: any): any => {
        if (obj === null || obj === undefined) {
          console.log(`  ⚠️ extractValue got null/undefined`);
          return null; // Return null instead of 0 to detect missing values
        }
        
        // If it's an object with a 'value' property, recursively extract
        if (typeof obj === 'object' && 'value' in obj) {
          return extractValue(obj.value);
        }
        
        // If it's already a primitive, return it
        return obj;
      };

      // Extract and convert values with proper type handling
      const amountValue = extractValue(data.amount);
      const depositBlockValue = extractValue(data['deposit-block']);
      const lockExpiryValue = extractValue(data['lock-expiry']);
      const lockOptionValue = extractValue(data['lock-option']);
      const withdrawnValue = extractValue(data.withdrawn);
      const isLockedValue = extractValue(isLockedData);
      const remainingBlocksValue = extractValue(remainingBlocksData);
      const nameValue = extractValue(data.name);

      console.log(`📦 Extracted raw values for #${depositId}:`, {
        amountValue,
        depositBlockValue,
        lockExpiryValue,
        lockOptionValue,
        withdrawnValue,
        isLockedValue,
        remainingBlocksValue,
        nameValue
      });
      
      // Validate that we got the amount - this is critical (unless deposit is withdrawn)
      const isWithdrawn = Boolean(withdrawnValue);
      if ((amountValue === null || amountValue === undefined) && !isWithdrawn) {
        console.error(`❌ CRITICAL: Amount is null/undefined for deposit #${depositId} and it's not marked as withdrawn`);
        console.error(`   Raw data structure:`, JSON.stringify(data, null, 2));
        return null;
      }
      
      // Convert values with detailed logging
      const amountInMicroStx = Number(amountValue) || 0;
      const amountInStx = microStxToStx(amountInMicroStx);
      
      console.log(`💰 Amount conversion for #${depositId}:`, {
        raw: amountValue,
        asMicroStx: amountInMicroStx,
        asStx: amountInStx,
        isWithdrawn
      });

      const depositInfo = {
        depositId,
        amount: amountInStx,
        depositBlock: Number(depositBlockValue) || 0,
        lockExpiry: Number(lockExpiryValue) || 0,
        lockOption: Number(lockOptionValue) || 0,
        withdrawn: isWithdrawn,
        isLocked: Boolean(isLockedValue),
        remainingBlocks: Number(remainingBlocksValue) || 0,
        name: nameValue && typeof nameValue === 'string' ? nameValue : undefined,
      };
      
      console.log(`✅ Deposit #${depositId} info:`, depositInfo);
      
      // Final validation - warn if active deposit has 0 amount
      if (depositInfo.amount === 0 && !depositInfo.withdrawn) {
        console.warn(`⚠️ WARNING: Deposit #${depositId} has 0 amount but is not withdrawn!`);
        console.warn(`   This might indicate a data extraction problem.`);
      }
      
      return depositInfo;
    } catch (err) {
      console.error(`❌ Error fetching deposit #${depositId} info:`, err);
      return null;
    }
  }, []); // No dependencies - uses ref

  // Cache for deposits to prevent unnecessary re-fetches and flickering
  const depositsCache = useRef<{
    data: DepositInfo[];
    timestamp: number;
    userAddress: string;
  } | null>(null);
  
  // Abort controller for cancelling in-flight requests
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Get all deposits for the current user
   * Implements caching and request cancellation to prevent flickering
   * Returns ALL deposits including withdrawn ones
   * @param forceRefresh - Force bypass cache and fetch fresh data
   * @returns Promise<DepositInfo[]>
   */
  const getAllUserDeposits = useCallback(async (forceRefresh: boolean = false): Promise<DepositInfo[]> => {
    const currentUserAddress = userAddressRef.current;
    if (!currentUserAddress) {
      console.log('⚠️ getAllUserDeposits: No user connected');
      return [];
    }

    // Check cache first (5 second cache to prevent rapid re-fetches)
    const now = Date.now();
    const cacheValid = depositsCache.current && 
                       depositsCache.current.userAddress === currentUserAddress &&
                       (now - depositsCache.current.timestamp) < 5000 &&
                       !forceRefresh;
    
    if (cacheValid) {
      console.log('📋 Using cached deposits data');
      return depositsCache.current!.data;
    }

    // Cancel any in-flight request
    if (abortControllerRef.current) {
      console.log('🚫 Cancelling previous deposit fetch request');
      abortControllerRef.current.abort();
    }

    // Create new abort controller for this request
    abortControllerRef.current = new AbortController();
    const currentAbortController = abortControllerRef.current;

    try {
      console.log('📋 ========================================');
      console.log('📋 Getting ALL deposits for user:', currentUserAddress);
      console.log('📋 This includes active AND withdrawn deposits');
      console.log('📋 ========================================');
      
      const depositIds = await getUserDepositIds();
      
      // Check if request was aborted
      if (currentAbortController.signal.aborted) {
        console.log('🚫 Request aborted during getUserDepositIds');
        return depositsCache.current?.data || [];
      }
      
      if (!Array.isArray(depositIds)) {
        console.error('❌ getUserDepositIds did not return an array:', depositIds);
        return [];
      }
      
      if (depositIds.length === 0) {
        console.log('📋 No deposit IDs found - user has no deposits');
        const emptyResult: DepositInfo[] = [];
        depositsCache.current = {
          data: emptyResult,
          timestamp: now,
          userAddress: currentUserAddress,
        };
        return emptyResult;
      }

      console.log(`📋 Found ${depositIds.length} deposit IDs:`, depositIds);
      console.log('📋 Fetching details for each deposit...');

      // Fetch detailed info for each deposit in parallel
      const depositPromises = depositIds.map(id => getDepositInfo(id));
      const deposits = await Promise.all(depositPromises);

      // Check if request was aborted
      if (currentAbortController.signal.aborted) {
        console.log('🚫 Request aborted during getDepositInfo');
        return depositsCache.current?.data || [];
      }

      // Ensure deposits is an array before filtering
      if (!Array.isArray(deposits)) {
        console.error('❌ Promise.all did not return an array:', deposits);
        return [];
      }

      // Filter out null results (deposits that don't exist)
      const validDeposits = deposits.filter((deposit): deposit is DepositInfo => deposit !== null);
      
      console.log('📋 ========================================');
      console.log(`📋 Successfully fetched ${validDeposits.length} out of ${depositIds.length} deposits`);
      console.log('📋 Breakdown:');
      console.log(`   - Active: ${validDeposits.filter(d => !d.withdrawn).length}`);
      console.log(`   - Withdrawn: ${validDeposits.filter(d => d.withdrawn).length}`);
      console.log(`   - Locked: ${validDeposits.filter(d => d.isLocked && !d.withdrawn).length}`);
      console.log(`   - Unlocked: ${validDeposits.filter(d => !d.isLocked && !d.withdrawn).length}`);
      console.log('📋 ========================================');
      
      if (validDeposits.length < depositIds.length) {
        const missingIds = depositIds.filter(id => !validDeposits.find(d => d.depositId === id));
        console.warn(`⚠️ WARNING: ${missingIds.length} deposits could not be fetched:`, missingIds);
      }
      
      // Update cache
      depositsCache.current = {
        data: validDeposits,
        timestamp: now,
        userAddress: currentUserAddress,
      };
      
      return validDeposits;
    } catch (err) {
      // If request was aborted, return cached data
      if (currentAbortController.signal.aborted) {
        console.log('🚫 Request aborted, returning cached data');
        return depositsCache.current?.data || [];
      }
      
      console.error('❌ Error fetching all user deposits:', err);
      return depositsCache.current?.data || [];
    }
  }, [getUserDepositIds, getDepositInfo]); // Stable dependencies

  /**
   * Get total balance across all active deposits
   * Uses cached deposit data to avoid redundant fetches
   * @returns Promise<number>
   * 
   * NOTE: We calculate this in the frontend instead of using the contract's
   * get-total-user-balance function because that function has a bug where
   * it uses tx-sender instead of the user parameter in its helper function.
   */
  const getTotalBalance = useCallback(async (): Promise<number> => {
    const currentUserAddress = userAddressRef.current;
    if (!currentUserAddress) {
      console.log('💰 No user connected, returning 0 balance');
      return 0;
    }

    try {
      console.log('💰 Calculating total balance in frontend for user:', currentUserAddress);
      
      // Use getAllUserDeposits which has caching built-in
      const deposits = await getAllUserDeposits();
      
      if (!Array.isArray(deposits) || deposits.length === 0) {
        console.log('💰 No deposits found, balance is 0');
        return 0;
      }
      
      const total = deposits
        .filter(d => d && !d.withdrawn)
        .reduce((sum, d) => sum + d.amount, 0);
      
      console.log('💰 Total balance calculated:', total, 'STX from', deposits.length, 'deposits');
      
      return total;
    } catch (err) {
      console.error('❌ Error calculating total balance:', err);
      return 0;
    }
  }, [getAllUserDeposits]); // Stable dependency

  /**
   * Get count of active deposits
   * Uses cached deposit data to avoid redundant fetches
   * @returns Promise<number>
   * 
   * NOTE: We calculate this in the frontend instead of using the contract's
   * get-active-deposit-count function because that function has a bug where
   * it uses tx-sender instead of the user parameter in its helper function.
   */
  const getActiveDepositCount = useCallback(async (): Promise<number> => {
    const currentUserAddress = userAddressRef.current;
    if (!currentUserAddress) {
      console.log('🔢 No user connected, returning 0 count');
      return 0;
    }

    try {
      console.log('🔢 Counting active deposits in frontend for user:', currentUserAddress);
      
      // Use getAllUserDeposits which has caching built-in
      const deposits = await getAllUserDeposits();
      
      if (!Array.isArray(deposits) || deposits.length === 0) {
        console.log('🔢 No deposits found, count is 0');
        return 0;
      }
      
      const count = deposits.filter(d => d && !d.withdrawn).length;
      
      console.log('🔢 Active deposit count:', count);
      
      return count;
    } catch (err) {
      console.error('❌ Error counting active deposits:', err);
      return 0;
    }
  }, [getAllUserDeposits]); // Stable dependency

  /**
   * Clear the deposits cache
   * Useful for forcing a fresh fetch after transactions
   */
  const clearCache = useCallback(() => {
    console.log('🗑️ Clearing deposits cache');
    depositsCache.current = null;
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  return {
    // Transaction functions
    createDeposit,
    withdrawDeposit,
    
    // Data fetching functions
    getUserDepositIds,
    getDepositInfo,
    getAllUserDeposits,
    getTotalBalance,
    getActiveDepositCount,
    
    // Cache management
    clearCache,
    
    // State
    isLoading,
    error,
  };
};