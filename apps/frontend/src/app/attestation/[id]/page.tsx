'use client'

// Force dynamic rendering to avoid WASM loading issues during build
export const dynamic = 'force-dynamic';

import { useState, useEffect } from "react"; 
import { SuiAttestation } from "@/components/attestations/sui-attestation";
import { AptosAttestation } from "@/components/attestations/aptos-attestation";
import { fetchAttestation } from "@/api/attestation";
import { getNetwork } from "@/utils/utils";
import { useChain, Chain } from "@/components/providers/chain-provider"
import { FullPageLoading } from "@/components/ui/loading-overlay";
import { AttestationWithSchema } from "@/api/types";

export default function AttestationPage({ params }: { params: { id: string } }) {
  const { currentChain, setCurrentChain } = useChain();
  const network = getNetwork();

  const [attestation, setAttestation] = useState<AttestationWithSchema | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { id } = params;

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetchAttestation(id, currentChain, network as any);
        if (response.success) {
          setAttestation(response.data);
        } else {
          setError(response.message || 'Failed to load attestation');
        }
      } catch (err) {
        console.error('Failed to fetch attestation:', err);
        setError('Failed to load attestation data');
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, [id, currentChain, network]);

  if (isLoading) {
    return <FullPageLoading text="Loading Attestation" showHeader={true} />;
  }

  if (error || !attestation) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50/30 via-white to-blue-50/30 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 text-red-500">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            {error || 'Attestation Not Found'}
          </h2>
          <p className="text-gray-600">
            {error || 'The requested attestation could not be loaded.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      {currentChain === 'sui' ?
        <SuiAttestation attestation={attestation} chain={currentChain} />
        :
        <AptosAttestation attestation={attestation} chain={currentChain} />
      }
    </>
  );
}