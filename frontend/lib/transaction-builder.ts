/**
 * Transaction Builder Utility
 * Centralizes transaction creation logic with comprehensive validation and error handling
 */

import { openContractCall } from '@stacks/connect';
import { 
  uintCV, 
  stringAsciiCV,
  someCV,
  noneCV,
  PostConditionMode,
  type ClarityValue 
} from '@stacks/transactions';
import { 
  CONTRACT_CONFIG, 
  getStacksNetwork, 
  isContractConfigValid, 
  getContractConfigError,
  stxToMicroStx,
  validateStxAmount 
} from './stacks-config';
import { verifyContractExists } from './contract';

export interface TransactionOptions {
  contractAddress?: string;
  contractName?: string;
  functionName: string;
  functionArgs: ClarityValue[];
  postConditionMode?: PostConditionMode;
  postConditions?: any[];
  onFinish?: (data: { txId: string }) => void;
  onCancel?: () => void;
  userAddress?: string;
}

export interface DepositTransactionParams {
  amount: number; // in STX
  lockOption: number;
  name?: string; // Optional deposit name
  userAddress: string;
  onFinish?: (data: { txId: string }) => void;
  onCancel?: () => void;
}

export interface WithdrawTransactionParams {
  amount: number; // in STX
  userAddress: string;
  onFinish?: (data: { txId: string }) => void;
  onCancel?: () => void;
}

/**
 * Validate all prerequisites for creating a transaction
 */
export async function validateTransactionPrerequisites(userAddress?: string): Promise<{
  isValid: boolean;
  error?: string;
}> {
  // Check if contract configuration is valid
  if (!isContractConfigValid()) {
    const configError = getContractConfigError();
    return {
      isValid: false,
      error: configError || 'Invalid contract configuration'
    };
  }

  // Check if user is connected
  if (!userAddress) {
    return {
      isValid: false,
      error: 'Wallet not connected. Please connect your wallet first.'
    };
  }

  // Verify contract exists on the network
  try {
    const contractExists = await verifyContractExists();
    if (!contractExists) {
      const network = getStacksNetwork();
      const networkType = process.env.NEXT_PUBLIC_NETWORK || 'testnet';
      const explorerUrl = networkType === 'mainnet' 
        ? `https://explorer.hiro.so/address/${CONTRACT_CONFIG.address}?chain=mainnet`
        : `https://explorer.hiro.so/address/${CONTRACT_CONFIG.address}?chain=testnet`;
      
      return {
        isValid: false,
        error: `Contract ${CONTRACT_CONFIG.address}.${CONTRACT_CONFIG.name} not found on ${networkType}.

Possible causes:
1. Contract not deployed yet - Run: clarinet deployments apply --${networkType}
2. Wrong contract address in .env.local
3. Wrong network selected (check NEXT_PUBLIC_NETWORK)

Verify on explorer: ${explorerUrl}

After deploying, update NEXT_PUBLIC_CONTRACT_ADDRESS in .env.local and restart the server.`
      };
    }
  } catch (error) {
    console.error('Error verifying contract:', error);
    return {
      isValid: false,
      error: `Unable to verify contract existence. Please check:
- Your internet connection
- The API URL: ${process.env.NEXT_PUBLIC_STACKS_API_URL || 'https://api.testnet.hiro.so'}
- Network status: https://status.hiro.so

Error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }

  return { isValid: true };
}

/**
 * Create a deposit transaction with comprehensive validation
 */
export async function createDepositTransaction(params: DepositTransactionParams): Promise<void> {
  const { amount, lockOption, userAddress, onFinish, onCancel } = params;

  // Validate prerequisites
  const validation = await validateTransactionPrerequisites(userAddress);
  if (!validation.isValid) {
    throw new Error(validation.error);
  }

  // Validate amount
  const amountValidation = validateStxAmount(amount);
  if (!amountValidation.valid) {
    throw new Error(amountValidation.error || 'Invalid amount');
  }

  // Validate lock option (1-13)
  if (lockOption < 1 || lockOption > 13) {
    throw new Error('Invalid lock option. Must be between 1 and 13.');
  }

  // Convert STX to microSTX
  const amountMicroStx = stxToMicroStx(amount);

  // Get network configuration
  const network = getStacksNetwork();

  // Prepare optional name parameter
  const nameArg = params.name ? someCV(stringAsciiCV(params.name)) : noneCV();

  // Log transaction details for debugging
  console.log('🔄 Creating deposit transaction:', {
    contractAddress: CONTRACT_CONFIG.address,
    contractName: CONTRACT_CONFIG.name,
    functionName: 'create-deposit',
    amount: amount,
    amountMicroStx: amountMicroStx,
    lockOption: lockOption,
    name: params.name || 'none',
    userAddress: userAddress,
    network: network.chainId || 'unknown',
    networkUrl: 'coreApiUrl' in network ? network.coreApiUrl : 'url' in network ? network.url : 'unknown'
  });

  try {
    await openContractCall({
      contractAddress: CONTRACT_CONFIG.address,
      contractName: CONTRACT_CONFIG.name,
      functionName: 'create-deposit',
      functionArgs: [
        uintCV(amountMicroStx),
        uintCV(lockOption),
        nameArg
      ],
      postConditionMode: PostConditionMode.Allow,
      network: network,
      onFinish: (data) => {
        console.log('✅ Deposit transaction successful:', data.txId);
        onFinish?.(data);
      },
      onCancel: () => {
        console.log('❌ Deposit transaction cancelled by user');
        onCancel?.();
      },
    });
  } catch (error) {
    console.error('❌ Error creating deposit transaction:', error);
    throw new Error(getTransactionErrorMessage(error));
  }
}

/**
 * Create a withdraw transaction with comprehensive validation
 */
export async function createWithdrawTransaction(params: WithdrawTransactionParams): Promise<void> {
  const { amount, userAddress, onFinish, onCancel } = params;

  // Validate prerequisites
  const validation = await validateTransactionPrerequisites(userAddress);
  if (!validation.isValid) {
    throw new Error(validation.error);
  }

  // Validate amount
  const amountValidation = validateStxAmount(amount);
  if (!amountValidation.valid) {
    throw new Error(amountValidation.error || 'Invalid amount');
  }

  // Convert STX to microSTX
  const amountMicroStx = stxToMicroStx(amount);

  // Get network configuration
  const network = getStacksNetwork();

  // Log transaction details for debugging
  console.log('🔄 Creating withdraw transaction:', {
    contractAddress: CONTRACT_CONFIG.address,
    contractName: CONTRACT_CONFIG.name,
    functionName: 'withdraw',
    amount: amount,
    amountMicroStx: amountMicroStx,
    userAddress: userAddress,
    network: network.chainId || 'unknown',
    networkUrl: 'coreApiUrl' in network ? network.coreApiUrl : 'url' in network ? network.url : 'unknown'
  });

  try {
    await openContractCall({
      contractAddress: CONTRACT_CONFIG.address,
      contractName: CONTRACT_CONFIG.name,
      functionName: 'withdraw',
      functionArgs: [uintCV(amountMicroStx)],
      postConditionMode: PostConditionMode.Allow,
      network: network,
      onFinish: (data) => {
        console.log('✅ Withdraw transaction successful:', data.txId);
        onFinish?.(data);
      },
      onCancel: () => {
        console.log('❌ Withdraw transaction cancelled by user');
        onCancel?.();
      },
    });
  } catch (error) {
    console.error('❌ Error creating withdraw transaction:', error);
    throw new Error(getTransactionErrorMessage(error));
  }
}

/**
 * Create a generic contract call transaction
 */
export async function createContractCallTransaction(options: TransactionOptions): Promise<void> {
  const {
    contractAddress = CONTRACT_CONFIG.address,
    contractName = CONTRACT_CONFIG.name,
    functionName,
    functionArgs,
    postConditionMode = PostConditionMode.Allow,
    postConditions = [],
    onFinish,
    onCancel,
    userAddress
  } = options;

  // Validate prerequisites
  const validation = await validateTransactionPrerequisites(userAddress);
  if (!validation.isValid) {
    throw new Error(validation.error);
  }

  // Get network configuration
  const network = getStacksNetwork();

  // Log transaction details for debugging
  console.log('🔄 Creating contract call transaction:', {
    contractAddress,
    contractName,
    functionName,
    functionArgs: functionArgs.map(arg => arg.toString()),
    userAddress,
    network: network.chainId || 'unknown'
  });

  try {
    await openContractCall({
      contractAddress,
      contractName,
      functionName,
      functionArgs,
      postConditionMode,
      postConditions,
      network,
      onFinish: (data) => {
        console.log('✅ Transaction successful:', data.txId);
        onFinish?.(data);
      },
      onCancel: () => {
        console.log('❌ Transaction cancelled by user');
        onCancel?.();
      },
    });
  } catch (error) {
    console.error('❌ Error creating transaction:', error);
    throw new Error(getTransactionErrorMessage(error));
  }
}

/**
 * Get user-friendly error message from transaction error
 */
function getTransactionErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    // Check for specific error patterns
    if (message.includes('insufficient')) {
      return 'Insufficient STX balance. Please check your wallet balance and try again.';
    }
    
    if (message.includes('contract') && (message.includes('not found') || message.includes('does not exist'))) {
      return 'Contract not found on the network. Please ensure the contract is deployed.';
    }
    
    if (message.includes('invalid') && message.includes('address')) {
      return 'Invalid contract address. Please check your configuration.';
    }
    
    if (message.includes('network')) {
      return 'Network error. Please check your connection and try again.';
    }
    
    if (message.includes('user rejected') || message.includes('cancelled')) {
      return 'Transaction was cancelled by user.';
    }
    
    if (message.includes('nonce')) {
      return 'Transaction nonce error. Please try again.';
    }
    
    if (message.includes('fee')) {
      return 'Transaction fee error. Please try again with a higher fee.';
    }

    // Return the original error message if no specific pattern matches
    return error.message;
  }

  return 'An unknown error occurred while creating the transaction.';
}

/**
 * Estimate transaction fee (placeholder - can be enhanced)
 */
export async function estimateTransactionFee(
  functionName: string,
  functionArgs: ClarityValue[]
): Promise<number> {
  // This is a simple estimation
  // In production, you might want to use the Stacks API to get accurate fee estimates
  const baseFee = 1000; // Base fee in microSTX
  const argFee = functionArgs.length * 100; // Additional fee per argument
  
  return baseFee + argFee;
}

/**
 * Check if wallet extension is installed
 */
export function isWalletExtensionInstalled(): boolean {
  if (typeof window === 'undefined') return false;
  
  // Check for common Stacks wallet extensions
  return !!(
    (window as any).StacksProvider ||
    (window as any).HiroWalletProvider ||
    (window as any).LeatherProvider
  );
}

/**
 * Get detailed transaction status
 */
export async function getTransactionStatus(txId: string): Promise<{
  status: 'pending' | 'success' | 'failed' | 'unknown';
  details?: any;
}> {
  try {
    const network = getStacksNetwork();
    const apiUrl = 'coreApiUrl' in network ? network.coreApiUrl : 
                   'url' in network ? network.url : 
                   process.env.NEXT_PUBLIC_STACKS_API_URL || 'https://api.testnet.hiro.so';
    
    const response = await fetch(`${apiUrl}/extended/v1/tx/${txId}`);
    
    if (!response.ok) {
      return { status: 'unknown' };
    }
    
    const data = await response.json();
    
    return {
      status: data.tx_status === 'success' ? 'success' : 
              data.tx_status === 'pending' ? 'pending' : 
              data.tx_status === 'abort_by_response' || data.tx_status === 'abort_by_post_condition' ? 'failed' : 
              'unknown',
      details: data
    };
  } catch (error) {
    console.error('Error fetching transaction status:', error);
    return { status: 'unknown' };
  }
}
