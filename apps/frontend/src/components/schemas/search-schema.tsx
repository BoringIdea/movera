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
    <div className="min-h-screen bg-white text-black">
      <Header />
      <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        <section className="border border-black px-6 py-5 space-y-3 bg-white">
          <p className="text-[0.6rem] font-black uppercase tracking-[0.4em] text-black/50">Schema Search</p>
          <h1 className="text-3xl font-black">Make an attestation</h1>
          <p className="text-sm font-bold text-black/60">Use existing schemas to issue attestations quickly.</p>
        </section>

        <section className="border border-black bg-[#F5F8FF] px-5 py-5 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-black uppercase tracking-[0.3em] text-black/60">Search By Schema ID / UID</p>
            <span className="text-[0.6rem] font-black tracking-[0.3em] text-black/40">{chain.toUpperCase()}</span>
          </div>
          <div className="flex flex-col md:flex-row gap-3">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="e.g. 7 or 0x3969bb..."
              className="flex-1 h-12 border border-black bg-white px-4 text-sm font-bold focus:outline-none"
            />
            <button
              onClick={handleSearch}
              disabled={isSearching}
              className="h-12 border border-black bg-[#2792FF] text-white font-black text-sm uppercase tracking-[0.4em] disabled:opacity-60"
            >
              {isSearching ? 'SEARCHING...' : 'SEARCH'}
            </button>
          </div>
          <p className="text-xs font-bold text-black/40">Search both on-chain schema IDs and their UID addresses.</p>
        </section>

        <section className="border border-black bg-white px-6 py-5 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-black uppercase tracking-[0.3em] text-black/60">Search Result</p>
            <span className="text-[0.6rem] font-black tracking-[0.2em] text-black/40">Latest match</span>
          </div>
          {searchResult ? (
            <Link href={`/schema/${searchResult.uid}`} className="block">
              <div className="border border-black bg-[#D0E8FF] px-5 py-4 space-y-1">
                <p className="text-[0.65rem] font-black uppercase tracking-[0.3em] text-black/60">#{searchResult.id}</p>
                <p className="text-sm font-black text-black break-all">{searchResult.uid}</p>
              </div>
            </Link>
          ) : (
            <div className="border border-black/30 px-4 py-6 text-sm font-bold text-black/60 text-center">No matching schema found yet.</div>
          )}
        </section>

        <section className="border border-black bg-[#F9FBFF] px-5 py-5 space-y-4">
          <p className="text-xs font-black uppercase tracking-[0.3em] text-black/60">Need inspiration?</p>
          {isLoadingFeatured ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="border border-black bg-white px-4 py-4 space-y-1 animate-pulse">
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
                  className="border border-black bg-white px-4 py-4 space-y-1 hover:bg-[#D0E8FF] transition-colors"
                >
                  <p className="text-[0.65rem] font-black uppercase tracking-[0.3em] text-black/60">#{schema.id}</p>
                  <p className="text-base font-black text-black">{schema.label}</p>
                  <p className="text-[0.6rem] font-bold tracking-[0.2em] text-black/40 break-all">{schema.uid}</p>
                </Link>
              ))}
            </div>
          ) : (
            <div className="border border-black/30 px-4 py-6 text-sm font-bold text-black/60 text-center">
              No schemas available at the moment.
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
