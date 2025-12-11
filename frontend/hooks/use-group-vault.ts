/**
 * Custom hook for Group Vault Contract interactions
 * Handles all group savings related contract calls and state management
 */

'use client';

import { useState, useCallback } from 'react';
import { useStacks } from './use-stacks';
import { 
  uintCV, 
  stringAsciiCV, 
  someCV, 
  noneCV,
} from '@stacks/transactions';
import { openContractCall } from '@stacks/connect';
import { 
  getStacksNetwork, 
  CONTRACT_CONFIG, 
  stxToMicroStx,
  isContractConfigValid,
  getContractConfigError 
} from '@/lib/stacks-config';
import { 
  getGroupInfo, 
  getAllGroups, 
  getOpenGroups, 
  isGroupMember, 
  getGroupBalance,
  getGroupRemainingBlocks,
  isGroupUnlocked,
  type GroupInfo 
} from '@/lib/group-contract';

export interface CreateGroupParams {
  name: string;
  lockOption: number;
  threshold?: number;
}

export interface GroupDepositParams {
  groupId: number;
  amount: number;
}

export interface GroupWithdrawParams {
  groupId: number;
  amount: number;
}

export const useGroupVault = () => {
  const { user, userSession, isConnected } = useStacks();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Create a new savings group
   * @param params - Group creation parameters
   * @returns Promise<string> - Transaction ID
   */
  const createGroup = useCallback(async (params: CreateGroupParams): Promise<string> => {
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
      
      // Prepare function arguments
      const functionArgs = [
        stringAsciiCV(params.name),
        uintCV(params.lockOption),
        params.threshold ? someCV(uintCV(params.threshold)) : noneCV(),
      ];

      // Use Stacks Connect to open contract call
      return new Promise((resolve, reject) => {
        openContractCall({
          network,
          contractAddress: CONTRACT_CONFIG.address,
          contractName: CONTRACT_CONFIG.name,
          functionName: 'create-group',
          functionArgs,
          onFinish: (data) => {
            resolve(data.txId);
          },
          onCancel: () => {
            reject(new Error('Transaction cancelled by user'));
          },
        });
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create group';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [isConnected, user]);

  /**
   * Join an existing savings group (legacy - no deposit required)
   * @param groupId - ID of the group to join
   * @returns Promise<string> - Transaction ID
   */
  const joinGroup = useCallback(async (groupId: number): Promise<string> => {
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
      
      // Prepare function arguments
      const functionArgs = [uintCV(groupId)];

      // Use Stacks Connect to open contract call
      return new Promise((resolve, reject) => {
        openContractCall({
          network,
          contractAddress: CONTRACT_CONFIG.address,
          contractName: CONTRACT_CONFIG.name,
          functionName: 'join-group',
          functionArgs,
          onFinish: (data) => {
            resolve(data.txId);
          },
          onCancel: () => {
            reject(new Error('Transaction cancelled by user'));
          },
        });
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to join group';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [isConnected, user]);

  /**
   * Join an existing savings group with initial deposit
   * @param params - Group join parameters with deposit amount
   * @returns Promise<string> - Transaction ID
   */
  const joinGroupWithDeposit = useCallback(async (params: GroupDepositParams): Promise<string> => {
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
        uintCV(params.groupId),
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
          functionName: 'join-group-with-deposit',
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
      const errorMessage = err instanceof Error ? err.message : 'Failed to join group with deposit';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [isConnected, user]);

  /**
   * Close a group to prevent new members (creator only)
   * @param groupId - ID of the group to close
   * @returns Promise<string> - Transaction ID
   */
  const closeGroup = useCallback(async (groupId: number): Promise<string> => {
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
      
      // Prepare function arguments
      const functionArgs = [uintCV(groupId)];

      // Use Stacks Connect to open contract call
      return new Promise((resolve, reject) => {
        openContractCall({
          network,
          contractAddress: CONTRACT_CONFIG.address,
          contractName: CONTRACT_CONFIG.name,
          functionName: 'close-group',
          functionArgs,
          onFinish: (data) => {
            resolve(data.txId);
          },
          onCancel: () => {
            reject(new Error('Transaction cancelled by user'));
          },
        });
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to close group';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [isConnected, user]);

  /**
   * Start the lock period for a group (creator only)
   * @param groupId - ID of the group to start
   * @returns Promise<string> - Transaction ID
   */
  const startGroupLock = useCallback(async (groupId: number): Promise<string> => {
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
      
      // Prepare function arguments
      const functionArgs = [uintCV(groupId)];

      // Use Stacks Connect to open contract call
      return new Promise((resolve, reject) => {
        openContractCall({
          network,
          contractAddress: CONTRACT_CONFIG.address,
          contractName: CONTRACT_CONFIG.name,
          functionName: 'start-group-lock',
          functionArgs,
          onFinish: (data) => {
            resolve(data.txId);
          },
          onCancel: () => {
            reject(new Error('Transaction cancelled by user'));
          },
        });
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start group lock';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [isConnected, user]);

  /**
   * Deposit STX into a group vault
   * @param params - Group deposit parameters
   * @returns Promise<string> - Transaction ID
   */
  const groupDeposit = useCallback(async (params: GroupDepositParams): Promise<string> => {
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
        uintCV(params.groupId),
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
          functionName: 'group-deposit',
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
      const errorMessage = err instanceof Error ? err.message : 'Failed to deposit to group';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [isConnected, user]);

  /**
   * Withdraw STX from a group vault
   * @param params - Group withdrawal parameters
   * @returns Promise<string> - Transaction ID
   */
  const groupWithdraw = useCallback(async (params: GroupWithdrawParams): Promise<string> => {
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
        uintCV(params.groupId),
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
          functionName: 'group-withdraw',
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
      const errorMessage = err instanceof Error ? err.message : 'Failed to withdraw from group';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [isConnected, user]);

  /**
   * Fetch group information with user-specific data
   * @param groupId - ID of the group
   * @returns Promise<GroupInfo & additional user data>
   */
  const fetchGroupWithUserData = useCallback(async (groupId: number) => {
    if (!user) return null;

    try {
      const [groupInfo, isMember, balance, remainingBlocks, isUnlocked] = await Promise.all([
        getGroupInfo(groupId),
        isGroupMember(groupId, user.address),
        getGroupBalance(groupId, user.address),
        getGroupRemainingBlocks(groupId),
        isGroupUnlocked(groupId),
      ]);

      if (!groupInfo) return null;

      return {
        ...groupInfo,
        isMember,
        userBalance: balance,
        remainingBlocks,
        isUnlocked,
      };
    } catch (err) {
      console.error('Error fetching group with user data:', err);
      return null;
    }
  }, [user]);

  /**
   * Fetch all groups with user-specific data
   * @returns Promise<Array<GroupInfo & additional user data>>
   */
  const fetchAllGroupsWithUserData = useCallback(async () => {
    if (!user) return [];

    try {
      const allGroups = await getAllGroups();
      
      // Fetch user-specific data for each group in parallel
      const groupsWithUserData = await Promise.all(
        allGroups.map(async (group) => {
          const [isMember, balance, remainingBlocks, isUnlocked] = await Promise.all([
            isGroupMember(group.groupId, user.address),
            getGroupBalance(group.groupId, user.address),
            getGroupRemainingBlocks(group.groupId),
            isGroupUnlocked(group.groupId),
          ]);

          return {
            ...group,
            isMember,
            userBalance: balance,
            remainingBlocks,
            isUnlocked,
          };
        })
      );

      return groupsWithUserData;
    } catch (err) {
      console.error('Error fetching all groups with user data:', err);
      return [];
    }
  }, [user]);

  /**
   * Fetch open groups (available for joining)
   * @returns Promise<Array<GroupInfo>>
   */
  const fetchOpenGroups = useCallback(async () => {
    try {
      return await getOpenGroups();
    } catch (err) {
      console.error('Error fetching open groups:', err);
      return [];
    }
  }, []);

  return {
    // Transaction functions
    createGroup,
    joinGroup,
    joinGroupWithDeposit,
    closeGroup,
    startGroupLock,
    groupDeposit,
    groupWithdraw,
    
    // Data fetching functions
    fetchGroupWithUserData,
    fetchAllGroupsWithUserData,
    fetchOpenGroups,
    
    // State
    isLoading,
    error,
    
    // Utility functions from group-contract
    getGroupInfo,
    getAllGroups,
    getOpenGroups,
    isGroupMember,
    getGroupBalance,
    getGroupRemainingBlocks,
    isGroupUnlocked,
  };
};