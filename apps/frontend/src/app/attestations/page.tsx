'use client'

import { useAttestorCount, useAttestationCount } from "@/api";
import { getNetwork } from "@/utils/utils";
import { Attestations } from "@/components/attestations/attestations";
import { useChain, Chain } from "@/components/providers/chain-provider"
import { FullPageLoading } from "@/components/ui/loading-overlay";

export default function AttestationsPage() {
  const { currentChain, setCurrentChain } = useChain();
  const network = getNetwork();

  const { data: attestorCountData, error: attestorCountError, isLoading: isLoadingAttestorCount } = useAttestorCount(currentChain, network as any);
  const { data: attestationCountData, error: attestationCountError, isLoading: isLoadingAttestationCount } = useAttestationCount(currentChain, network as any);
  
  const error = attestorCountError || attestationCountError;
  const isLoading = isLoadingAttestorCount || isLoadingAttestationCount;

  // Handle API errors
  const hasApiError = (attestorCountData && !attestorCountData.success) || (attestationCountData && !attestationCountData.success);
  const apiErrorMessage = attestorCountData?.message || attestationCountData?.message;

  if (isLoading) {
    return <FullPageLoading text="Loading Attestations" showHeader={true} />;
  }

  if (error || hasApiError) {
    return (
      <div className="mv-shell flex items-center justify-center px-4">
        <div className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 text-[#b42318]">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="mv-heading mb-2">Failed to Load Data</h2>
          <p className="mv-copy">
            {apiErrorMessage || "Error loading attestation data. Please try refreshing the page."}
          </p>
        </div>
      </div>
    );
  }

  const attestorCount = attestorCountData?.success ? attestorCountData.data.count : 0;
  const attestationCount = attestationCountData?.success ? attestationCountData.data.count : 0;

  return (
    <Attestations 
      chain={currentChain}
      attestorCnt={attestorCount} 
      attestationCnt={attestationCount}
    />
  );
}
