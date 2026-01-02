'use client'

import { useState, useEffect } from 'react';
import { useChain } from '@/components/providers/chain-provider';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { useWallet } from '@aptos-labs/wallet-adapter-react';

interface PassportUser {
  address: string;
  created_at: string;
}

interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}

interface CheckUserResponse {
  exists: boolean;
  address: string;
  chain: string;
}

interface RegisterUserResponse {
  address: string;
  chain: string;
}

interface UsePassportRegistrationReturn {
  isRegistered: boolean | null;
  isLoading: boolean;
  error: string | null;
  registerPassport: () => Promise<void>;
  isRegistering: boolean;
  isWaitingForSignature: boolean;
  registrationProgress: {
    currentStep: number;
    totalSteps: number;
    elapsedTime: number;
    estimatedTime: number;
  };
  isBackendCompleted: boolean;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export function usePassportRegistration(): UsePassportRegistrationReturn {
  const [state, setState] = useState<UsePassportRegistrationReturn>({
    isRegistered: null,
    isLoading: true,
    error: null,
    registerPassport: async () => {},
    isRegistering: false,
    isWaitingForSignature: false,
    registrationProgress: {
      currentStep: 0,
      totalSteps: 5,
      elapsedTime: 0,
      estimatedTime: 150, // 2.5 minutes total
    },
    isBackendCompleted: false,
  });

  const { currentChain } = useChain();
  const suiAccount = useCurrentAccount();
  const { account: aptosAccount, signMessage } = useWallet();

  const userAddress = currentChain === 'sui' ? suiAccount?.address : aptosAccount?.address;

  // Check if user is registered
  useEffect(() => {
    async function checkUserRegistration() {
      if (!userAddress) {
        setState(prev => ({ ...prev, isRegistered: null, isLoading: false, error: null }));
        return;
      }

      try {
        setState(prev => ({ ...prev, isLoading: true, error: null }));
        
        const response = await fetch(`${API_BASE_URL}/api/v1/passport/check?address=${userAddress}&chain=${currentChain}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const responseData: ApiResponse<CheckUserResponse> = await response.json();
          // Parse unified response format: { data: { exists, address, chain }, success, message }
          setState(prev => ({ 
            ...prev, 
            isRegistered: responseData.data.exists, 
            isLoading: false, 
            error: null 
          }));
        } else {
          const errorData: ApiResponse<any> = await response.json();
          throw new Error(errorData.message || 'Failed to check user registration');
        }
      } catch (err) {
        setState(prev => ({ 
          ...prev, 
          isLoading: false, 
          error: err instanceof Error ? err.message : 'Failed to check registration' 
        }));
      }
    }

    checkUserRegistration();
  }, [userAddress, currentChain]);

  // Progress tracking with smart timeout extension
  useEffect(() => {
    if (!state.isRegistering) return

    const interval = setInterval(() => {
      setState(prev => {
        const newElapsed = prev.registrationProgress.elapsedTime + 1
        const newStep = Math.min(Math.floor(newElapsed / 30), prev.registrationProgress.totalSteps - 1) // 30 seconds per step
        
        // If we've reached the estimated time but backend isn't completed, extend by 30 seconds
        let newEstimatedTime = prev.registrationProgress.estimatedTime
        if (newElapsed >= prev.registrationProgress.estimatedTime && !prev.isBackendCompleted) {
          newEstimatedTime = prev.registrationProgress.estimatedTime + 30
        }
        
        return {
          ...prev,
          registrationProgress: {
            ...prev.registrationProgress,
            elapsedTime: newElapsed,
            currentStep: newStep,
            estimatedTime: newEstimatedTime,
          }
        }
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [state.isRegistering, state.isBackendCompleted])

  // Register passport function
  const registerPassport = async () => {
    if (!userAddress || !signMessage) {
      throw new Error('Wallet not connected or signMessage not available');
    }

    // First, set waiting for signature state
    setState(prev => ({ 
      ...prev, 
      isWaitingForSignature: true,
      error: null,
    }));

    try {
      // Create message to sign
      const message = `Register Passport for ${userAddress} at ${new Date().toISOString()}`;
      
      // Sign the message
      const signature = await signMessage({
        message,
        nonce: '1234567890', // TODO: random string
      });

      // After signature is completed, start the backend processing
      setState(prev => ({ 
        ...prev, 
        isWaitingForSignature: false,
        isRegistering: true, 
        isBackendCompleted: false,
        registrationProgress: {
          currentStep: 0,
          totalSteps: 5,
          elapsedTime: 0,
          estimatedTime: 150,
        }
      }));
      
      // Convert signature to string - handle different signature formats
      let signatureString: string;
      try {
        if (signature.signature instanceof Uint8Array) {
          signatureString = Array.from(signature.signature)
            .map((b: any) => b.toString(16).padStart(2, '0'))
            .join('');
        } else {
          signatureString = String(signature.signature);
        }
      } catch (error) {
        // Fallback: use JSON stringify
        signatureString = JSON.stringify(signature.signature);
      }

      // Send registration request to backend
      const response = await fetch(`${API_BASE_URL}/api/v1/passport/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          address: userAddress,
          chain: currentChain,
          message,
          signature: signatureString,
        }),
      });

      if (response.ok) {
        const responseData: ApiResponse<RegisterUserResponse> = await response.json();
        // Parse unified response format: { data: { address, chain }, success, message }
        setState(prev => ({ 
          ...prev, 
          isRegistered: true, 
          isRegistering: false, 
          error: null,
          isBackendCompleted: true,
          registrationProgress: {
            currentStep: 5,
            totalSteps: 5,
            elapsedTime: 0,
            estimatedTime: 150,
          }
        }));
      } else {
        const errorData: ApiResponse<any> = await response.json();
        throw new Error(errorData.message || 'Registration failed');
      }
    } catch (err) {
      setState(prev => ({ 
        ...prev, 
        isRegistering: false,
        isWaitingForSignature: false,
        error: err instanceof Error ? err.message : 'Registration failed' 
      }));
      throw err;
    }
  };

  return {
    ...state,
    registerPassport,
  };
}
