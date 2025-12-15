/**
 * Navigation Bar Component
 * Provides navigation links and wallet connection status
 */

'use client';

import Link from 'next/link';
import { useWallet } from '@/contexts/wallet-context';
import WalletConnectNavbar from './wallet-connect-navbar';

export default function Navbar() {
  const { user, isConnected } = useWallet();

  return (
    <nav className="bg-gray-800 shadow-sm border-b border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Brand */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">SS</span>
              </div>
              <span className="text-xl font-semibold text-white">GrowFundz</span>
            </Link>
          </div>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-8">
            <Link 
              href="/" 
              className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
            >
              Dashboard
            </Link>
            <Link 
              href="/deposit" 
              className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
            >
              Deposit
            </Link>
            <Link 
              href="/withdraw" 
              className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
            >
              Withdraw
            </Link>
            <Link 
              href="/groups" 
              className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
            >
              Groups
            </Link>
          </div>

          {/* Wallet Connection */}
          <div className="flex items-center">
            <WalletConnectNavbar />
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      <div className="md:hidden">
        <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 border-t border-gray-700">
          <Link
            href="/"
            className="text-gray-300 hover:text-white block px-3 py-2 rounded-md text-base font-medium transition-colors"
          >
            Dashboard
          </Link>
          <Link
            href="/deposit"
            className="text-gray-300 hover:text-white block px-3 py-2 rounded-md text-base font-medium transition-colors"
          >
            Deposit
          </Link>
          <Link
            href="/withdraw"
            className="text-gray-300 hover:text-white block px-3 py-2 rounded-md text-base font-medium transition-colors"
          >
            Withdraw
          </Link>
          <Link
            href="/groups"
            className="text-gray-300 hover:text-white block px-3 py-2 rounded-md text-base font-medium transition-colors"
          >
            Groups
          </Link>
          
          {/* Mobile Wallet Connection */}
          <div className="px-3 py-2 border-t border-gray-700">
            <WalletConnectNavbar />
          </div>
        </div>
      </div>
    </nav>
  );
}