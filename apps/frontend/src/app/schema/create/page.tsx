'use client'

// Force dynamic rendering to avoid WASM loading issues during build
export const dynamic = 'force-dynamic';

import { CreateSuiSchema } from "@/components/schemas/create-sui-schema";
import { CreateAptosSchema } from "@/components/schemas/create-aptos-schema";
import { useChain, Chain } from "@/components/providers/chain-provider";

export default function CreateSchemaPage() {
  const { currentChain, setCurrentChain } = useChain();
  return (
    <div className="flex justify-center items-center min-h-screen">
      {
        currentChain === 'sui' ?
        <CreateSuiSchema chain={currentChain} />
        :
         <CreateAptosSchema chain={currentChain} />
      }
    </div>
  )
}