'use client'

import { useState, useEffect } from "react"
import Link from "next/link"
import { Header } from "@/components/header"
import { searchSchemas, fetchSchemas } from "@/api/schema"
import { getNetwork } from "@/utils/utils"
import { Chain } from "@/components/providers/chain-provider"

interface SearchResult {
  id: string
  uid: string
}

interface FeaturedSchema {
  id: string
  label: string
  uid: string
}

export function SearchSchema({ chain }: { chain: Chain }) {
  const network = getNetwork()
  const [searchInput, setSearchInput] = useState("")
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [featuredSchemas, setFeaturedSchemas] = useState<FeaturedSchema[]>([])
  const [isLoadingFeatured, setIsLoadingFeatured] = useState(true)

  // Fetch featured/recommended schemas from backend
  useEffect(() => {
    const loadFeaturedSchemas = async () => {
      try {
        setIsLoadingFeatured(true)
        const response = await fetchSchemas(chain, network as any, { offset: 0, limit: 4 })
        
        if (response.success && response.data) {
          const schemas = response.data.map((schema: any, index: number) => ({
            id: schema.id?.toString() || (index + 1).toString(),
            label: schema.name || `Schema ${schema.id || index + 1}`,
            uid: schema.address || schema.uid || '',
          }))
          setFeaturedSchemas(schemas)
        }
      } catch (error) {
        console.error('Failed to load featured schemas:', error)
        // Keep empty array on error
        setFeaturedSchemas([])
      } finally {
        setIsLoadingFeatured(false)
      }
    }

    loadFeaturedSchemas()
  }, [chain, network])

  const handleSearch = async () => {
    setIsSearching(true)
    if (!searchInput.trim()) {
      setSearchResult(null)
      setIsSearching(false)
      return
    }

    const response = await searchSchemas(chain, network as any, { searchInput })
    const schemasResult = response.success ? response.data : []

    if (schemasResult && schemasResult.length > 0) {
      const schema = schemasResult[0]
      setSearchResult({
        id: schema.id.toString(),
        uid: schema.address,
      })
    } else {
      setSearchResult(null)
    }

    setIsSearching(false)
  }

  return (
    <div className="mv-shell">
      <Header />
      <main className="mv-frame space-y-6 py-8">
        <section className="mv-panel bg-white px-6 py-5 space-y-3">
          <p className="mv-kicker">Schema Search</p>
          <h1 className="mv-title text-3xl md:text-4xl">Make an attestation</h1>
          <p className="mv-copy">Use existing schemas to issue attestations quickly.</p>
        </section>

        <section className="mv-panel-muted px-5 py-5 space-y-4">
          <div className="flex items-center justify-between">
            <p className="mv-kicker">Search By Schema ID / UID</p>
            <span className="font-mono text-[10px] tracking-[0.16em] text-black/40">{chain.toUpperCase()}</span>
          </div>
          <div className="flex flex-col md:flex-row gap-3">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="e.g. 7 or 0x3969bb..."
              className="mv-input flex-1 h-12 px-4 text-sm"
            />
            <button
              onClick={handleSearch}
              disabled={isSearching}
              className="mv-btn-primary h-12 disabled:opacity-60"
            >
              {isSearching ? 'SEARCHING...' : 'SEARCH'}
            </button>
          </div>
          <p className="text-xs text-black/40">Search both on-chain schema IDs and their UID addresses.</p>
        </section>

        <section className="mv-panel bg-white px-6 py-5 space-y-3">
          <div className="flex items-center justify-between">
            <p className="mv-kicker">Search Result</p>
            <span className="font-mono text-[10px] tracking-[0.16em] text-black/40">Latest match</span>
          </div>
          {searchResult ? (
            <Link href={`/schema/${searchResult.uid}`} className="block">
              <div className="border border-black/10 bg-[rgba(245,249,255,0.92)] px-5 py-4 space-y-1">
                <p className="mv-kicker">#{searchResult.id}</p>
                <p className="text-sm text-black break-all">{searchResult.uid}</p>
              </div>
            </Link>
          ) : (
            <div className="border border-black/10 px-4 py-6 text-sm text-black/60 text-center">No matching schema found yet.</div>
          )}
        </section>

        <section className="mv-panel-muted px-5 py-5 space-y-4">
          <p className="mv-kicker">Need inspiration?</p>
          {isLoadingFeatured ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="border border-black/10 bg-white/72 px-4 py-4 space-y-1 animate-pulse">
                  <div className="h-3 bg-gray-200 w-16"></div>
                  <div className="h-5 bg-gray-200 w-3/4"></div>
                  <div className="h-3 bg-gray-200 w-full"></div>
                </div>
              ))}
            </div>
          ) : featuredSchemas.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {featuredSchemas.map((schema) => (
                <Link
                  href={`/schema/${schema.uid}`}
                  key={schema.id}
                  className="border border-black/10 bg-white px-4 py-4 space-y-1 transition-colors hover:bg-[rgba(245,249,255,0.92)]"
                >
                  <p className="mv-kicker">#{schema.id}</p>
                  <p className="text-base text-black">{schema.label}</p>
                  <p className="font-mono text-[10px] tracking-[0.16em] text-black/40 break-all">{schema.uid}</p>
                </Link>
              ))}
            </div>
          ) : (
            <div className="border border-black/10 px-4 py-6 text-sm text-black/60 text-center">
              No schemas available at the moment.
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
