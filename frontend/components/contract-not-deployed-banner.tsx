/**
 * Contract Not Deployed Banner
 * Shows a helpful message when the contract hasn't been deployed yet
 */

'use client';

import { validateContractConfig } from '@/lib/contract';

export default function ContractNotDeployedBanner() {
  const isConfigValid = validateContractConfig();
  const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
  
  // Only show if contract is not deployed
  if (isConfigValid || (contractAddress && contractAddress !== 'DEPLOY_CONTRACT_FIRST')) {
    return null;
  }

  return (
    <div className="bg-yellow-900/20 border-l-4 border-yellow-500 p-4 mb-6">
      <div className="flex">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium text-yellow-200">
            Contract Not Deployed
          </h3>
          <div className="mt-2 text-sm text-yellow-300">
            <p className="mb-2">
              The GrowFundz contract hasn't been deployed to testnet yet. To use this application:
            </p>
            <ol className="list-decimal list-inside space-y-1 ml-2">
              <li>Deploy the contract: <code className="bg-yellow-900/30 px-2 py-1 rounded">clarinet deployments apply --testnet</code></li>
              <li>Copy the deployed contract address from the output</li>
              <li>Update <code className="bg-yellow-900/30 px-2 py-1 rounded">NEXT_PUBLIC_CONTRACT_ADDRESS</code> in <code className="bg-yellow-900/30 px-2 py-1 rounded">.env.local</code></li>
              <li>Restart the development server: <code className="bg-yellow-900/30 px-2 py-1 rounded">npm run dev</code></li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
