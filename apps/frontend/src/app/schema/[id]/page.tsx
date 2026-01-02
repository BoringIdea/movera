'use client'

// Force dynamic rendering to avoid WASM loading issues during build
export const dynamic = 'force-dynamic';

import { useState, useEffect } from "react"; 
import SuiSchema from "@/components/schemas/sui-schema";
import AptosSchema from "@/components/schemas/aptos-schema";
import { fetchSchema } from "@/api/schema";
import { getNetwork } from "@/utils/utils";
import { useChain, Chain } from "@/components/providers/chain-provider"
import { FullPageLoading } from "@/components/ui/loading-overlay";
import { Schema } from "@/api/types";

export default function SchemaPage({ params }: { params: { id: string } }) {
  const { currentChain, setCurrentChain } = useChain();
  const [schema, setSchema] = useState<Schema | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const network = getNetwork();
  const { id } = params;

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetchSchema(id, currentChain, network as any);
        if (response.success) {
          setSchema(response.data);
        } else {
          setError(response.message || 'Failed to load schema');
        }
      } catch (err) {
        console.error('Failed to fetch schema:', err);
        setError('Failed to load schema data');
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, [id, currentChain, network]);

  if (isLoading) {
    return <FullPageLoading text="Loading Schema" showHeader={true} />;
  }

  if (error || !schema) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50/30 via-white to-blue-50/30 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 text-red-500">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            {error || 'Schema Not Found'}
          </h2>
          <p className="text-gray-600">
            {error || 'The requested schema could not be loaded.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      {currentChain === "sui" ? (
        <SuiSchema schema={schema} chain={currentChain} />
      ) : (
        <AptosSchema schema={schema} chain={currentChain} />
      )}
    </>
  );
}