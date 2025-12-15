/**
 * Stacks Network Configuration
 * Centralizes network settings and contract information for the GrowFundz dApp
 */

import { 
  STACKS_MAINNET, 
  STACKS_TESTNET, 
  STACKS_DEVNET 
} from '@stacks/network';

// Network configuration based on environment
export const getStacksNetwork = () => {
  const networkType = process.env.NEXT_PUBLIC_NETWORK || 'testnet';
  
  let network;
  
  switch (networkType) {
    case 'mainnet':
      network = STACKS_MAINNET;
      break;
    case 'testnet':
      network = STACKS_TESTNET;
      break;
    case 'devnet':
      // For devnet, we'll use a custom configuration
      network = {
        ...STACKS_DEVNET,
        coreApiUrl: process.env.NEXT_PUBLIC_STACKS_API_URL || 'http://localhost:3999',
      };
      break;
    default:
      network = STACKS_TESTNET;
  }
  
  // Ensure the network object has all required properties
  if (!network) {
    console.error('Failed to initialize network configuration');
    return STACKS_TESTNET;
  }
  
  // Log network configuration for debugging
  console.log('🌐 Network configuration:', {
    type: networkType,
    chainId: network.chainId || 'unknown',
    coreApiUrl: 'coreApiUrl' in network ? network.coreApiUrl : 'url' in network ? network.url : 'unknown'
  });
  
  return network;
};

// Contract configuration - loaded from environment variables
export const CONTRACT_CONFIG = {
  address: process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || '',
  name: process.env.NEXT_PUBLIC_CONTRACT_NAME || 'GrowFundz',
} as const;

/**
 * Validate that contract configuration is properly set
 * @returns boolean indicating if configuration is valid for transactions
 */
export const isContractConfigValid = (): boolean => {
  const address = CONTRACT_CONFIG.address;
  const name = CONTRACT_CONFIG.name;
  
  // Check if address exists and is not empty
  if (!address || address === '' || address === 'DEPLOY_CONTRACT_FIRST') {
    return false;
  }
  
  // Check if address has valid Stacks format (ST for testnet, SP for mainnet)
  if (!address.startsWith('ST') && !address.startsWith('SP')) {
    return false;
  }
  
  // Check if address has reasonable length (Stacks addresses are typically 40-42 chars)
  if (address.length < 38 || address.length > 45) {
    return false;
  }
  
  // Check if contract name exists
  if (!name || name === '') {
    return false;
  }
  
  return true;
};

/**
 * Get contract configuration validation error message
 * @returns Error message if config is invalid, null otherwise
 */
export const getContractConfigError = (): string | null => {
  if (!CONTRACT_CONFIG.address || CONTRACT_CONFIG.address === '') {
    return 'Contract address is not set. Please deploy the contract and update NEXT_PUBLIC_CONTRACT_ADDRESS in .env.local';
  }
  
  if (CONTRACT_CONFIG.address === 'DEPLOY_CONTRACT_FIRST') {
    return 'Contract not deployed yet. Please deploy the GrowFundz contract to testnet using "clarinet deployments apply --testnet", then update NEXT_PUBLIC_CONTRACT_ADDRESS in .env.local with the deployed address';
  }
  
  if (!CONTRACT_CONFIG.address.startsWith('ST') && !CONTRACT_CONFIG.address.startsWith('SP')) {
    return `Invalid contract address format: "${CONTRACT_CONFIG.address}". Stacks addresses must start with ST (testnet) or SP (mainnet). Please check your .env.local file.`;
  }
  
  if (CONTRACT_CONFIG.address.length < 38 || CONTRACT_CONFIG.address.length > 45) {
    return `Invalid contract address length: "${CONTRACT_CONFIG.address}". Stacks addresses should be 40-42 characters long. Please verify the address in your .env.local file.`;
  }
  
  if (!CONTRACT_CONFIG.name || CONTRACT_CONFIG.name === '') {
    return 'Contract name is not set. Please update NEXT_PUBLIC_CONTRACT_NAME in .env.local';
  }
  
  return null;
};

/**
 * Get detailed contract configuration info for debugging
 * @returns Object with configuration details and validation status
 */
export const getContractConfigInfo = () => {
  return {
    address: CONTRACT_CONFIG.address,
    name: CONTRACT_CONFIG.name,
    isValid: isContractConfigValid(),
    error: getContractConfigError(),
    network: process.env.NEXT_PUBLIC_NETWORK || 'testnet',
    apiUrl: process.env.NEXT_PUBLIC_STACKS_API_URL || 'https://api.testnet.hiro.so',
  };
};

// Error codes from the updated Clarity contract
export const CONTRACT_ERRORS = {
  ERR_INVALID_AMOUNT: 100,
  ERR_STILL_LOCKED: 101,
  ERR_NO_DEPOSIT: 102,
  ERR_UNAUTHORIZED: 103,
  ERR_INSUFFICIENT_BALANCE: 104,
  ERR_INVALID_LOCK_OPTION: 105, // New error for invalid lock duration options
} as const;

// Convert microSTX to STX for display
export const microStxToStx = (microStx: number | bigint): number => {
  return Number(microStx) / 1_000_000;
};

// Convert STX to microSTX for transactions
export const stxToMicroStx = (stx: number): number => {
  return Math.floor(stx * 1_000_000);
};

// Alternative BigInt version if needed
export const stxToMicroStxBigInt = (stx: number): bigint => {
  return BigInt(Math.floor(stx * 1_000_000));
};
/**

 * Test the STX to microSTX conversion
 * @param stx - Amount in STX
 * @returns Conversion test results
 */
export const testStxConversion = (stx: number) => {
  const microStx = stxToMicroStx(stx);
  const backToStx = microStxToStx(microStx);
  
  return {
    input: stx,
    microStx,
    backToStx,
    isCorrect: Math.abs(backToStx - stx) < 0.000001, // Allow for floating point precision
    details: {
      expectedMicroStx: stx * 1_000_000,
      actualMicroStx: microStx,
      difference: microStx - (stx * 1_000_000)
    }
  };
};

/**
 * Validate STX amount for deposits
 * @param stx - Amount in STX
 * @returns Validation result
 */
export const validateStxAmount = (stx: number): { valid: boolean; error?: string } => {
  if (isNaN(stx) || !isFinite(stx)) {
    return { valid: false, error: 'Amount must be a valid number' };
  }
  
  if (stx <= 0) {
    return { valid: false, error: 'Amount must be greater than 0' };
  }
  
  if (stx < 0.000001) {
    return { valid: false, error: 'Minimum amount is 0.000001 STX (1 microSTX)' };
  }
  
  if (stx > 1000000) {
    return { valid: false, error: 'Maximum amount is 1,000,000 STX' };
  }
  
  const microStx = stxToMicroStx(stx);
  if (microStx !== Math.floor(stx * 1_000_000)) {
    return { valid: false, error: 'Conversion error: precision loss detected' };
  }
  
  return { valid: true };
};