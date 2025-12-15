/**
 * Wallet Context Provider
 * Centralizes wallet connection state management across the entire app
 */

'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { AppConfig, UserSession, authenticate } from '@stacks/connect';

// App configuration for Stacks Connect
const appConfig = new AppConfig(['store_write', 'publish_data']);

export interface StacksUser {
  address: string;
  profile?: Record<string, unknown>;
}

interface WalletContextType {
  user: StacksUser | null;
  isLoading: boolean;
  isConnected: boolean;
  error: string | null;
  connectWallet: () => void;
  disconnectWallet: () => void;
  userSession: UserSession;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

interface WalletProviderProps {
  children: ReactNode;
}

export function WalletProvider({ children }: WalletProviderProps) {
  const [userSession] = useState(() => new UserSession({ appConfig }));
  const [user, setUser] = useState<StacksUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check if user is already signed in on component mount
  useEffect(() => {
    const checkUserSession = async () => {
      try {
        setError(null);
        console.log('🔍 WalletProvider: Checking user session...');
        
        if (userSession.isSignInPending()) {
          console.log('🔄 WalletProvider: Sign in pending, handling...');
          const userData = await userSession.handlePendingSignIn();
          console.log('✅ WalletProvider: User data received:', userData);
          
          const address = userData.profile.stxAddress.testnet || userData.profile.stxAddress.mainnet;
          setUser({
            address,
            profile: userData.profile,
          });
          console.log('✅ WalletProvider: User set with address:', address);
        } else if (userSession.isUserSignedIn()) {
          console.log('✅ WalletProvider: User already signed in, loading data...');
          const userData = userSession.loadUserData();
          console.log('✅ WalletProvider: Loaded user data:', userData);
          
          const address = userData.profile.stxAddress.testnet || userData.profile.stxAddress.mainnet;
          setUser({
            address,
            profile: userData.profile,
          });
          console.log('✅ WalletProvider: User set with address:', address);
        } else {
          console.log('ℹ️ WalletProvider: No user session found');
        }
      } catch (error) {
        console.error('❌ WalletProvider: Error checking user session:', error);
        setError('Failed to check wallet connection');
      } finally {
        setIsLoading(false);
      }
    };

    checkUserSession();
  }, [userSession]);

  // Connect wallet function
  const connectWallet = useCallback(() => {
    try {
      setError(null);
      console.log('🔄 WalletProvider: Initiating wallet connection...');
      
      authenticate({
        appDetails: {
          name: 'GrowFundz',
          icon: typeof window !== 'undefined' ? window.location.origin + '/next.svg' : '/next.svg',
        },
        redirectTo: '/',
        onFinish: (authData) => {
          console.log('✅ WalletProvider: Wallet connection finished:', authData);
          try {
            const userData = authData.userSession.loadUserData();
            const address = userData.profile.stxAddress.testnet || userData.profile.stxAddress.mainnet;
            setUser({
              address,
              profile: userData.profile,
            });
            console.log('✅ WalletProvider: User connected with address:', address);
          } catch (err) {
            console.error('❌ WalletProvider: Error processing auth data:', err);
            setError('Failed to process wallet connection');
          }
        },
        onCancel: () => {
          console.log('ℹ️ WalletProvider: Wallet connection cancelled');
        },
        userSession,
      });
    } catch (error) {
      console.error('❌ WalletProvider: Error connecting wallet:', error);
      setError(`Failed to connect wallet: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [userSession]);

  // Disconnect wallet function
  const disconnectWallet = useCallback(() => {
    try {
      console.log('🔄 WalletProvider: Disconnecting wallet...');
      userSession.signUserOut();
      setUser(null);
      setError(null);
      console.log('✅ WalletProvider: Wallet disconnected successfully');
    } catch (error) {
      console.error('❌ WalletProvider: Error disconnecting wallet:', error);
      setError('Failed to disconnect wallet');
    }
  }, [userSession]);

  const value: WalletContextType = {
    user,
    isLoading,
    isConnected: !!user,
    error,
    connectWallet,
    disconnectWallet,
    userSession,
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
}

// Custom hook to use the wallet context
export function useWallet(): WalletContextType {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}

// Keep the old useStacks hook for backward compatibility
export const useStacks = useWallet;