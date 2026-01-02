'use client'

// Force dynamic rendering to avoid WASM loading issues during build
export const dynamic = 'force-dynamic';

import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { NewSuiAttestation } from "@/components/attestations/new-sui-attestation";
import { NewAptosAttestation } from "@/components/attestations/new-aptos-attestation";
import { fetchSchema } from "@/api/schema";
import { Schema } from "@/api/types";
import { getNetwork } from "@/utils/utils";
import { useChain, Chain } from "@/components/providers/chain-provider"
import { LoadingOverlay, FullPageLoading } from "@/components/ui/loading-overlay";

function CreateAttestationContent() {
  const { currentChain, setCurrentChain } = useChain();
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const [schema, setSchema] = useState<Schema | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const network = getNetwork();

  useEffect(() => {
    async function fetchData() {
      if (!id) return;
      setIsLoading(true);
      try {
        const response = await fetchSchema(id, currentChain, network as any);
        if (response.success) {
          setSchema(response.data);
        } else {
          console.error('Failed to fetch schema:', response.message);
          setSchema(null);
        }
      } catch (error) {
        console.error('Failed to fetch schema:', error);
        setSchema(null);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [id, currentChain, network]);

  if (isLoading) {
    return (
      <LoadingOverlay 
        size="lg" 
        text="Loading Schema..." 
        showBackground={true}
      />
    );
  }

  if (!schema) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50/30 via-white to-blue-50/30 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 text-red-500">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Schema Not Found</h2>
          <p className="text-gray-600">The requested schema could not be loaded.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-center items-center min-h-screen">
      {
        currentChain === "sui" ?
        <NewSuiAttestation 
          chain={currentChain}
          schema={schema} 
        /> :
        <NewAptosAttestation 
          chain={currentChain}
          schema={schema} 
        />
      }
    </div>
  );
}

export default function CreateAttestationPage() {
  return (
    <Suspense fallback={<FullPageLoading text="Preparing Attestation Form" showHeader={true} />}>
      <CreateAttestationContent />
    </Suspense>
  );
}