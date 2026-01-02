'use client'

import { Dashboard } from "@/components/dashboard";
import { useAttestorCount, useAttestationCount, useSchemaCount } from "@/api";
import { getNetwork } from "@/utils/utils";
import { useChain, Chain } from "@/components/providers/chain-provider"
import { FullPageLoading } from "@/components/ui/loading-overlay";

export default function DashboardPage() {
  const { currentChain, setCurrentChain } = useChain();
  const network = getNetwork();

  const { data: attestorCountData, error: attestorCountError, isLoading: isLoadingAttestorCount } = useAttestorCount(currentChain, network as any);
  const { data: attestationCountData, error: attestationCountError, isLoading: isLoadingAttestationCount } = useAttestationCount(currentChain, network as any);
  const { data: schemaCountData, error: schemaCountError, isLoading: isLoadingSchemaCount } = useSchemaCount(currentChain, network as any);

  const isLoading = isLoadingAttestorCount || isLoadingAttestationCount || isLoadingSchemaCount;
  
  // Handle API errors
  const hasApiError = (attestorCountData && !attestorCountData.success) || 
                      (attestationCountData && !attestationCountData.success) || 
                      (schemaCountData && !schemaCountData.success);
  const apiErrorMessage = attestorCountData?.message || attestationCountData?.message || schemaCountData?.message;
  
  if (isLoading) {
    return <FullPageLoading text="Loading Dashboard" showHeader={true} />;
  }

  // Handle errors gracefully
  if (attestorCountError || attestationCountError || schemaCountError || hasApiError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50/30 via-white to-blue-50/30 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 text-red-500">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Failed to Load Dashboard</h2>
          <p className="text-gray-600">
            {apiErrorMessage || "Some data could not be loaded. Please try refreshing the page."}
          </p>
        </div>
      </div>
    );
  }

  const attestorCount = attestorCountData?.success ? attestorCountData.data.count : 0;
  const attestationCount = attestationCountData?.success ? attestationCountData.data.count : 0;
  const schemaCount = schemaCountData?.success ? schemaCountData.data.count : 0;

  return (
    <>
      <Dashboard 
        chain={currentChain}
        attestorCount={attestorCount}
        attestationCount={attestationCount}
        schemaCount={schemaCount}
      />
    </>
  );
}