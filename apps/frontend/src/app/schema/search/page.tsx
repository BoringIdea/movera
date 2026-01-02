'use client'

import { SearchSchema } from '@/components/schemas/search-schema'
import { useChain } from '@/components/providers/chain-provider'

export default function SchemaSearchPage() {
  const { currentChain } = useChain()

  if (!currentChain) {
    return (
      <div className="min-h-screen bg-white text-black flex items-center justify-center">
        <p className="text-sm font-black uppercase tracking-[0.3em] text-black/60">Select a chain to start searching schemas.</p>
      </div>
    )
  }

  return <SearchSchema chain={currentChain} />
}
