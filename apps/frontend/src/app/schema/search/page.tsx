'use client'

import { SearchSchema } from '@/components/schemas/search-schema'
import { useChain } from '@/components/providers/chain-provider'

export default function SchemaSearchPage() {
  const { currentChain } = useChain()

  if (!currentChain) {
    return (
      <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
        <div className="mv-shell flex min-h-screen items-center justify-center">
          <div className="mv-panel px-8 py-8 text-center">
            <p className="mv-kicker">Schema Search</p>
            <p className="mv-copy mt-3">Select a chain to start searching schemas.</p>
          </div>
        </div>
      </div>
    )
  }

  return <SearchSchema chain={currentChain} />
}
