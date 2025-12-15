/**
 * Group Savings Contract Integration
 * Handles all group-related contract interactions for GrowFundz
 */

import { getStacksNetwork, CONTRACT_CONFIG, microStxToStx, stxToMicroStx } from './stacks-config';
import { fetchCallReadOnlyFunction, cvToJSON, standardPrincipalCV, uintCV } from '@stacks/transactions';

export interface GroupInfo {
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
}

export interface GroupMember {
  amount: number;
  depositBlock: number;
  joinedBlock: number;
}

export interface GroupMemberList {
  members: string[];
}

/**
 * Get group information by ID
 * @param groupId - The group ID to fetch
 * @returns Promise<GroupInfo | null> - Group information or null if not found
 */
export const getGroupInfo = async (groupId: number): Promise<GroupInfo | null> => {
  try {
    const network = getStacksNetwork();
    
    const result = await fetchCallReadOnlyFunction({
      contractAddress: CONTRACT_CONFIG.address,
      contractName: CONTRACT_CONFIG.name,
      functionName: 'get-group',
      functionArgs: [uintCV(groupId)],
      network,
      senderAddress: CONTRACT_CONFIG.address,
    });

    const groupData = cvToJSON(result);
    
    if (groupData && typeof groupData === 'object' && 'value' in groupData && groupData.value) {
      const data = groupData.value as Record<string, { value: any }>;
      return {
        groupId,
        creator: data.creator?.value || '',
        name: data.name?.value || '',
        duration: Number(data.duration?.value || 0),
        threshold: data.threshold?.value ? Number(data.threshold.value) : undefined,
        memberCount: Number(data['member-count']?.value || 0),
        closed: Boolean(data.closed?.value),
        locked: Boolean(data.locked?.value),
        startBlock: data['start-block']?.value ? Number(data['start-block'].value) : undefined,
        lockExpiry: data['lock-expiry']?.value ? Number(data['lock-expiry'].value) : undefined,
      };
    }

    return null;
  } catch (error) {
    console.error('Error fetching group info:', error);
    return null;
  }
};

/**
 * Get member information for a specific group
 * @param groupId - The group ID
 * @param memberAddress - The member's address
 * @returns Promise<GroupMember | null> - Member information or null if not found
 */
export const getGroupMember = async (groupId: number, memberAddress: string): Promise<GroupMember | null> => {
  try {
    const network = getStacksNetwork();
    
    const result = await fetchCallReadOnlyFunction({
      contractAddress: CONTRACT_CONFIG.address,
      contractName: CONTRACT_CONFIG.name,
      functionName: 'get-group-member',
      functionArgs: [uintCV(groupId), standardPrincipalCV(memberAddress)],
      network,
      senderAddress: CONTRACT_CONFIG.address,
    });

    const memberData = cvToJSON(result);
    
    if (memberData && typeof memberData === 'object' && 'value' in memberData && memberData.value) {
      const data = memberData.value as Record<string, { value: number }>;
      return {
        amount: microStxToStx(Number(data.amount?.value || 0)),
        depositBlock: Number(data['deposit-block']?.value || 0),
        joinedBlock: Number(data['joined-block']?.value || 0),
      };
    }

    return null;
  } catch (error) {
    console.error('Error fetching group member:', error);
    return null;
  }
};

/**
 * Get all members of a group
 * @param groupId - The group ID
 * @returns Promise<string[]> - Array of member addresses
 */
export const getGroupMembers = async (groupId: number): Promise<string[]> => {
  try {
    const network = getStacksNetwork();
    
    const result = await fetchCallReadOnlyFunction({
      contractAddress: CONTRACT_CONFIG.address,
      contractName: CONTRACT_CONFIG.name,
      functionName: 'get-group-members',
      functionArgs: [uintCV(groupId)],
      network,
      senderAddress: CONTRACT_CONFIG.address,
    });

    const membersData = cvToJSON(result);
    
    if (membersData && typeof membersData === 'object' && 'value' in membersData) {
      const data = membersData.value as Record<string, { value: string[] }>;
      return data.members?.value || [];
    }

    return [];
  } catch (error) {
    console.error('Error fetching group members:', error);
    return [];
  }
};

/**
 * Get member's balance in a group
 * @param groupId - The group ID
 * @param memberAddress - The member's address
 * @returns Promise<number> - Member's balance in STX
 */
export const getGroupBalance = async (groupId: number, memberAddress: string): Promise<number> => {
  try {
    const network = getStacksNetwork();
    
    const result = await fetchCallReadOnlyFunction({
      contractAddress: CONTRACT_CONFIG.address,
      contractName: CONTRACT_CONFIG.name,
      functionName: 'get-group-balance',
      functionArgs: [uintCV(groupId), standardPrincipalCV(memberAddress)],
      network,
      senderAddress: CONTRACT_CONFIG.address,
    });

    const balanceData = cvToJSON(result);
    
    if (balanceData && typeof balanceData === 'object' && 'value' in balanceData) {
      return microStxToStx(Number(balanceData.value));
    }

    return 0;
  } catch (error) {
    console.error('Error fetching group balance:', error);
    return 0;
  }
};

/**
 * Check if a group's lock has expired
 * @param groupId - The group ID
 * @returns Promise<boolean> - Whether the group is unlocked
 */
export const isGroupUnlocked = async (groupId: number): Promise<boolean> => {
  try {
    const network = getStacksNetwork();
    
    const result = await fetchCallReadOnlyFunction({
      contractAddress: CONTRACT_CONFIG.address,
      contractName: CONTRACT_CONFIG.name,
      functionName: 'is-group-unlocked',
      functionArgs: [uintCV(groupId)],
      network,
      senderAddress: CONTRACT_CONFIG.address,
    });

    const unlockData = cvToJSON(result);
    
    if (unlockData && typeof unlockData === 'object' && 'value' in unlockData) {
      return Boolean(unlockData.value);
    }

    return false;
  } catch (error) {
    console.error('Error checking group unlock status:', error);
    return false;
  }
};

/**
 * Get remaining lock time for a group in blocks
 * @param groupId - The group ID
 * @returns Promise<number> - Remaining blocks
 */
export const getGroupRemainingBlocks = async (groupId: number): Promise<number> => {
  try {
    const network = getStacksNetwork();
    
    const result = await fetchCallReadOnlyFunction({
      contractAddress: CONTRACT_CONFIG.address,
      contractName: CONTRACT_CONFIG.name,
      functionName: 'get-group-remaining-blocks',
      functionArgs: [uintCV(groupId)],
      network,
      senderAddress: CONTRACT_CONFIG.address,
    });

    const remainingData = cvToJSON(result);
    
    if (remainingData && typeof remainingData === 'object' && 'value' in remainingData) {
      return Number(remainingData.value);
    }

    return 0;
  } catch (error) {
    console.error('Error fetching group remaining blocks:', error);
    return 0;
  }
};

/**
 * Get current group counter (total number of groups created)
 * @returns Promise<number> - Total number of groups
 */
export const getGroupCounter = async (): Promise<number> => {
  try {
    const network = getStacksNetwork();
    
    const result = await fetchCallReadOnlyFunction({
      contractAddress: CONTRACT_CONFIG.address,
      contractName: CONTRACT_CONFIG.name,
      functionName: 'get-group-counter',
      functionArgs: [],
      network,
      senderAddress: CONTRACT_CONFIG.address,
    });

    const counterData = cvToJSON(result);
    
    if (counterData && typeof counterData === 'object' && 'value' in counterData) {
      return Number(counterData.value);
    }

    return 0;
  } catch (error) {
    console.error('Error fetching group counter:', error);
    return 0;
  }
};

/**
 * Check if user is a member of a group
 * @param groupId - The group ID
 * @param memberAddress - The member's address
 * @returns Promise<boolean> - Whether the user is a member
 */
export const isGroupMember = async (groupId: number, memberAddress: string): Promise<boolean> => {
  try {
    const network = getStacksNetwork();
    
    const result = await fetchCallReadOnlyFunction({
      contractAddress: CONTRACT_CONFIG.address,
      contractName: CONTRACT_CONFIG.name,
      functionName: 'is-group-member',
      functionArgs: [uintCV(groupId), standardPrincipalCV(memberAddress)],
      network,
      senderAddress: CONTRACT_CONFIG.address,
    });

    const memberData = cvToJSON(result);
    
    if (memberData && typeof memberData === 'object' && 'value' in memberData) {
      return Boolean(memberData.value);
    }

    return false;
  } catch (error) {
    console.error('Error checking group membership:', error);
    return false;
  }
};

/**
 * Get all available groups (up to the current counter)
 * @returns Promise<GroupInfo[]> - Array of all groups
 */
export const getAllGroups = async (): Promise<GroupInfo[]> => {
  try {
    const totalGroups = await getGroupCounter();
    const groups: GroupInfo[] = [];
    
    // Fetch all groups in parallel
    const groupPromises = [];
    for (let i = 1; i <= totalGroups; i++) {
      groupPromises.push(getGroupInfo(i));
    }
    
    const groupResults = await Promise.all(groupPromises);
    
    // Filter out null results
    for (const group of groupResults) {
      if (group) {
        groups.push(group);
      }
    }
    
    return groups;
  } catch (error) {
    console.error('Error fetching all groups:', error);
    return [];
  }
};

/**
 * Get groups that are open for joining
 * @returns Promise<GroupInfo[]> - Array of open groups
 */
export const getOpenGroups = async (): Promise<GroupInfo[]> => {
  try {
    const allGroups = await getAllGroups();
    
    // Filter for groups that are not closed and not full
    return allGroups.filter(group => {
      if (group.closed) return false;
      if (group.threshold && group.memberCount >= group.threshold) return false;
      return true;
    });
  } catch (error) {
    console.error('Error fetching open groups:', error);
    return [];
  }
};