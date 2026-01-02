'use client'

// Force dynamic rendering to avoid WASM loading issues during build
export const dynamic = 'force-dynamic';

import { useSchemaCount, useSchemaCreatorCount } from "@/api";
import { getNetwork } from "@/utils/utils";
import { Schemas } from "@/components/schemas/schemas";
import { useChain } from "@/components/providers/chain-provider";
import { FullPageLoading } from "@/components/ui/loading-overlay";

export default function SchemasPage() {
  const { currentChain, setCurrentChain } = useChain();
  const network = getNetwork();

  const { data: schemaCountData, error: schemaCountError, isLoading: isLoadingSchemaCount } = useSchemaCount(currentChain, network as any);
  const { data: creatorCountData, error: creatorCntError, isLoading: isLoadingCreatorCnt } = useSchemaCreatorCount(currentChain, network as any);

  const error = schemaCountError || creatorCntError;
  const isLoading = isLoadingSchemaCount || isLoadingCreatorCnt;

  // Handle API errors
  const hasApiError = (schemaCountData && !schemaCountData.success) || (creatorCountData && !creatorCountData.success);
  const apiErrorMessage = schemaCountData?.message || creatorCountData?.message;

  if (isLoading) {
    return <FullPageLoading text="Loading Schemas" showHeader={true} />;
  }

  if (error || hasApiError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50/30 via-white to-blue-50/30 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 text-red-500">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h17.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Failed to Load Schemas</h2>
          <p className="text-gray-600">
            {apiErrorMessage || "Error loading schema data. Please try refreshing the page."}
          </p>
        </div>
      </div>
    );
  }

  const schemaCount = schemaCountData?.success ? schemaCountData.data.count : 0;
  const creatorCount = creatorCountData?.success ? creatorCountData.data.count : 0;

  return (
    <Schemas 
      chain={currentChain} 
      network={network} 
      schemaCnt={schemaCount} 
      creatorCnt={creatorCount} 
    />
  );
}