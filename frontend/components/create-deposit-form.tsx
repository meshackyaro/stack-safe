/**
 * Create Deposit Form Component
 * Allows users to create new deposits with independent lock periods
 */

'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@/contexts/wallet-context';
import { useMultipleDeposits } from '@/hooks/use-multiple-deposits';
import { useSTXPrice } from '@/hooks/use-stx-price';
import { getLockDurationOptions } from '@/lib/lock-options';

interface CreateDepositFormProps {
  onDepositCreated?: (depositId: number) => void;
  onCancel?: () => void;
}

export default function CreateDepositForm({ onDepositCreated, onCancel }: CreateDepositFormProps) {
  const { isConnected, user } = useWallet();
  const { createDeposit, error: hookError } = useMultipleDeposits();
  const { 
    stxPrice, 
    minimumSTX, 
    minimumUSD, 
    isLoading: priceLoading, 
    error: priceError,
    calculateUSDValue,
    formatUSDPrice,
    formatSTX,
    isDataAvailable,
    lastUpdated,
  } = useSTXPrice();
  
  const [formData, setFormData] = useState({
    amount: '',
    lockOption: 5, // Default to 1 day
    name: '', // Optional deposit name
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [validationError, setValidationError] = useState<string>('');
  const [priceUpdateIndicator, setPriceUpdateIndicator] = useState<boolean>(false);

  // Get lock duration options
  const lockOptions = getLockDurationOptions();

  // Track price updates for visual feedback
  useEffect(() => {
    if (!priceLoading && isDataAvailable) {
      setPriceUpdateIndicator(true);
      const timer = setTimeout(() => setPriceUpdateIndicator(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [stxPrice, minimumSTX, priceLoading, isDataAvailable]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isConnected) {
      setError('Please connect your wallet first');
      return;
    }

    const depositAmount = parseFloat(formData.amount);
    
    if (!formData.amount || depositAmount <= 0) {
      setError('Please enter a valid deposit amount');
      return;
    }

    // Validate minimum deposit amount
    if (isDataAvailable && depositAmount < minimumSTX) {
      setError(`Minimum deposit is ${formatSTX(minimumSTX)} STX (${formatUSDPrice(minimumUSD)})`);
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      // Use the centralized transaction builder
      const { createDepositTransaction } = await import('@/lib/transaction-builder');
      
      await createDepositTransaction({
        amount: depositAmount,
        lockOption: formData.lockOption,
        name: formData.name || undefined,
        userAddress: user?.address || '',
        onFinish: (data) => {
          console.log('✅ Deposit transaction submitted:', data.txId);
          setSuccess(`Deposit created successfully! Transaction ID: ${data.txId}`);
          
          // Reset form
          setFormData({
            amount: '',
            lockOption: 5,
            name: '',
          });

          // Notify parent component immediately to trigger refresh
          if (onDepositCreated) {
            console.log('🔄 Triggering parent refresh after deposit creation');
            onDepositCreated(0);
          }
        },
        onCancel: () => {
          setError('Transaction was cancelled');
        },
      });
    } catch (err) {
      console.error('Create deposit error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to create deposit';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle input changes with validation
  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));

    // Real-time validation for amount field
    if (field === 'amount' && typeof value === 'string') {
      const amount = parseFloat(value);
      if (value && !isNaN(amount) && isDataAvailable) {
        if (amount < minimumSTX) {
          setValidationError(`Minimum deposit is ${formatSTX(minimumSTX)} STX (${formatUSDPrice(minimumUSD)})`);
        } else {
          setValidationError('');
        }
      } else {
        setValidationError('');
      }
    }
  };

  // Get selected lock option details
  const selectedOption = lockOptions.find(opt => opt.value === formData.lockOption);

  // Calculate approximate unlock time
  const getApproximateUnlockTime = () => {
    if (!selectedOption) return '';
    
    const minutes = selectedOption.blocks * 10; // Approximate 10 minutes per block
    const unlockDate = new Date(Date.now() + (minutes * 60 * 1000));
    
    return unlockDate.toLocaleString();
  };

  return (
    <div className="bg-gray-800 rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white">Create New Deposit</h2>
        {onCancel && (
          <button
            onClick={onCancel}
            className="text-gray-500 hover:text-gray-300"
          >
            <span className="sr-only">Close</span>
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Information Banner */}
      <div className="bg-purple-50 border border-purple-200 rounded-md p-4 mb-6">
        <div className="flex">
          <div className="flex-shrink-0">
            <span className="text-purple-600 text-xl">💎</span>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-purple-800">Multiple Independent Deposits</h3>
            <div className="mt-2 text-sm text-purple-700">
              <p>Create multiple deposits with different amounts and lock periods. Give each deposit a custom name to track your savings goals. Each deposit operates independently and can be withdrawn separately when its lock period expires.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Price Information */}
      <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-sm font-medium text-blue-800 mb-2">Current STX Price & Minimum Deposit</h3>
            {priceLoading ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                <span className="text-sm text-blue-700">Loading price data...</span>
              </div>
            ) : priceError ? (
              <div className="text-sm text-red-700">
                <p>⚠️ Unable to fetch current price. Using fallback minimum.</p>
              </div>
            ) : isDataAvailable ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-700">
                <div>
                  <p>
                    <strong>STX Price:</strong> {formatUSDPrice(stxPrice)}
                    {priceUpdateIndicator && (
                      <span className="ml-2 inline-flex items-center">
                        <span className="animate-pulse text-green-600 text-xs">●</span>
                        <span className="ml-1 text-xs text-green-600">Updated</span>
                      </span>
                    )}
                  </p>
                  <p><strong>Minimum Deposit:</strong> {formatSTX(minimumSTX)} STX</p>
                </div>
                <div>
                  <p><strong>Minimum USD Value:</strong> {formatUSDPrice(minimumUSD)}</p>
                  <p>
                    <strong>Last Updated:</strong> {lastUpdated.toLocaleTimeString()}
                    <span className="ml-2 text-xs text-blue-600">
                      (Auto-updates every 15s)
                    </span>
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-blue-700">Price data unavailable</p>
            )}
          </div>
          <div className="text-right">
            <span className="text-2xl">💰</span>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {(error || hookError) && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
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
        <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-6">
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

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Deposit Name Input */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-white-700 mb-2">
            Deposit Name (Optional)
          </label>
          <input
            type="text"
            id="name"
            maxLength={50}
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            placeholder="e.g., Emergency Fund, Vacation Savings, etc."
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          />
          <p className="mt-1 text-xs text-gray-500">
            Give your deposit a meaningful name to help track your savings goals (max 50 characters)
          </p>
        </div>

        {/* Amount Input */}
        <div>
          <label htmlFor="amount" className="block text-sm font-medium text-gray-300 mb-2">
            Deposit Amount (STX)
          </label>
          <div className="relative">
            <input
              type="number"
              id="amount"
              step="0.000001"
              min={isDataAvailable ? minimumSTX : 0.000001}
              value={formData.amount}
              onChange={(e) => handleInputChange('amount', e.target.value)}
              placeholder={isDataAvailable ? `Minimum: ${formatSTX(minimumSTX)} STX` : "Enter amount in STX"}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 ${
                validationError ? 'border-red-300' : 'border-gray-300'
              }`}
              required
            />
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <span className="text-gray-500 text-sm">STX</span>
            </div>
          </div>
          
          {/* Real-time USD value display */}
          {formData.amount && !isNaN(parseFloat(formData.amount)) && isDataAvailable && (
            <div className="mt-1 text-sm text-gray-400">
              ≈ {formatUSDPrice(calculateUSDValue(parseFloat(formData.amount)))} USD
            </div>
          )}
          
          {/* Validation error */}
          {validationError && (
            <p className="mt-1 text-xs text-red-600">{validationError}</p>
          )}
          
          {/* Minimum deposit info */}
          <p className="mt-1 text-xs text-gray-500">
            {isDataAvailable 
              ? `Minimum deposit: ${formatSTX(minimumSTX)} STX (${formatUSDPrice(minimumUSD)})`
              : 'Minimum deposit: Loading...'
            }
          </p>
        </div>

        {/* Lock Duration Selection */}
        <div>
          <label htmlFor="lockOption" className="block text-sm font-medium text-gray-300 mb-2">
            Lock Duration
          </label>
          <select
            id="lockOption"
            value={formData.lockOption}
            onChange={(e) => handleInputChange('lockOption', parseInt(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            required
          >
            {lockOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label} - {option.description}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-gray-500">
            Your funds will be locked for this duration and cannot be withdrawn early
          </p>
        </div>

        {/* Lock Duration Details */}
        {selectedOption && (
          <div className="bg-gray-800 rounded-lg p-4">
            <h4 className="text-sm font-medium text-white mb-2">Lock Duration Details</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-400">Duration: <span className="font-medium text-white">{selectedOption.label}</span></p>
                <p className="text-gray-400">Category: <span className="font-medium text-white capitalize">{selectedOption.category}-term</span></p>
              </div>
              <div>
                <p className="text-gray-400">Blocks: <span className="font-medium text-white">{selectedOption.blocks}</span></p>
                <p className="text-gray-400">Approx. unlock: <span className="font-medium text-white">{getApproximateUnlockTime()}</span></p>
              </div>
            </div>
            <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-xs text-yellow-800">
                <strong>Important:</strong> {selectedOption.description}. Once created, this deposit cannot be withdrawn until the lock period expires.
              </p>
            </div>
          </div>
        )}

        {/* Form Actions */}
        <div className="flex space-x-4">
          <button
            type="submit"
            disabled={isLoading || !isConnected || !!validationError || priceLoading}
            className="flex-1 flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Creating Deposit...
              </div>
            ) : (
              'Create Deposit'
            )}
          </button>
          
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={isLoading}
              className="px-6 py-3 border border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-300 dark:text-gray-200 bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 dark:focus:ring-offset-gray-800"
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      {/* Connection Status */}
      {!isConnected && (
        <div className="mt-6 text-center py-4 bg-gray-800 rounded-lg">
          <p className="text-sm text-gray-500">
            Please connect your wallet to create a deposit
          </p>
        </div>
      )}

      {/* Benefits Section */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="text-center p-4 bg-blue-50 rounded-lg">
          <div className="text-2xl mb-2">🔒</div>
          <h4 className="font-semibold text-blue-900 mb-1">Secure Lock</h4>
          <p className="text-xs text-blue-800">Funds secured by smart contract until unlock time</p>
        </div>
        
        <div className="text-center p-4 bg-green-50 rounded-lg">
          <div className="text-2xl mb-2">🎯</div>
          <h4 className="font-semibold text-green-900 mb-1">Independent</h4>
          <p className="text-xs text-green-800">Each deposit has its own lock period and withdrawal</p>
        </div>
        
        <div className="text-center p-4 bg-purple-50 rounded-lg">
          <div className="text-2xl mb-2">📈</div>
          <h4 className="font-semibold text-purple-900 mb-1">Flexible</h4>
          <p className="text-xs text-purple-800">Create multiple deposits with different durations</p>
        </div>
        
        <div className="text-center p-4 bg-orange-50 rounded-lg">
          <div className="text-2xl mb-2">🏷️</div>
          <h4 className="font-semibold text-orange-900 mb-1">Named</h4>
          <p className="text-xs text-orange-800">Give deposits custom names to track savings goals</p>
        </div>
      </div>
    </div>
  );
}