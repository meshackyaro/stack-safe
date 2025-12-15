/**
 * Custom hook for Stacks wallet connection and authentication
 * Manages wallet state, connection, and user session
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { AppConfig, UserSession, authenticate } from '@stacks/connect';

// App configuration for Stacks Connect
const appConfig = new AppConfig(['store_write', 'publish_data']);

export interface StacksUser {
  address: string;
  profile?: Record<string, unknown>;
}

export const useStacks = () => {
  const [userSession] = useState(() => new UserSession({ appConfig }));
  const [user, setUser] = useState<StacksUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check if user is already signed in on component mount
  useEffect(() => {
    const checkUserSession = async () => {
      try {
        setError(null);
        console.log('Checking user session...');
        
        if (userSession.isSignInPending()) {
          console.log('Sign in pending, handling...');
          const userData = await userSession.handlePendingSignIn();
          console.log('User data received:', userData);
          
          const address = userData.profile.stxAddress.testnet || userData.profile.stxAddress.mainnet;
          setUser({
            address,
            profile: userData.profile,
          });
          console.log('User set with address:', address);
        } else if (userSession.isUserSignedIn()) {
          console.log('User already signed in, loading data...');
          const userData = userSession.loadUserData();
          console.log('Loaded user data:', userData);
          
          const address = userData.profile.stxAddress.testnet || userData.profile.stxAddress.mainnet;
          setUser({
            address,
            profile: userData.profile,
          });
          console.log('User set with address:', address);
        } else {
          console.log('No user session found');
        }
      } catch (error) {
        console.error('Error checking user session:', error);
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
      console.log('Initiating wallet connection...');
      
      authenticate({
        appDetails: {
          name: 'GrowFundz',
          icon: typeof window !== 'undefined' ? window.location.origin + '/next.svg' : '/next.svg',
        },
        redirectTo: '/',
        onFinish: (authData) => {
          console.log('Wallet connection finished:', authData);
          try {
            const userData = authData.userSession.loadUserData();
            const address = userData.profile.stxAddress.testnet || userData.profile.stxAddress.mainnet;
            setUser({
              address,
              profile: userData.profile,
            });
            console.log('User connected with address:', address);
          } catch (err) {
            console.error('Error processing auth data:', err);
            setError('Failed to process wallet connection');
          }
        },
        onCancel: () => {
          console.log('Wallet connection cancelled');
        },
        userSession,
      });
    } catch (error) {
      console.error('Error connecting wallet:', error);
      setError(`Failed to connect wallet: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [userSession]);

  // Disconnect wallet function
  const disconnectWallet = useCallback(() => {
    try {
      console.log('Disconnecting wallet...');
      userSession.signUserOut();
      setUser(null);
      setError(null);
      // Don't reload the page, just update state
    } catch (error) {
      console.error('Error disconnecting wallet:', error);
      setError('Failed to disconnect wallet');
    }
  }, [userSession]);

  return {
    user,
    isLoading,
    isConnected: !!user,
    error,
    connectWallet,
    disconnectWallet,
    userSession,
  };
};