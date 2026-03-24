'use client'

import { Input } from "@/components/ui/input"
import { SearchIcon, GitHubIcon, LinkIcon } from "@/components/icons"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { ConnectButton } from '@mysten/dapp-kit';
import { fetchAttestation } from "@/api/attestation"
import { searchSchemas } from "@/api/schema"
import { useState, useEffect, useCallback, useMemo } from "react"
import { debounce } from "lodash"
import Image from 'next/image'
import { ChainConfig, getChains, getNetwork } from "@/utils/utils"
import * as Select from '@radix-ui/react-select';
import { ChevronDownIcon } from '@radix-ui/react-icons'
import { useChain, Chain } from "@/components/providers/chain-provider"
import { WalletSelector } from "./WalletSelector"
import { Menu, X } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const chains = getChains()

const hoverStyles = "transition-colors duration-200 hover:text-[#5f9bff]"

export function Header() {
  const { currentChain, setCurrentChain } = useChain()

  const pathname = usePathname()

  const selectedChain = chains.find((chain) => chain.chain === currentChain) || chains[0];

  const handleChainChange = useCallback((chain: ChainConfig) => {
    setCurrentChain(chain.chain as Chain);
  }, [setCurrentChain]);

  const NavLink = ({
    href,
    children,
    target,
    rel
  }: {
    href: string;
    children: React.ReactNode;
    target?: string;
    rel?: string;
  }) => {
    const isActive = pathname === href
    const isExternal = href.startsWith('http')
    return (
      <Link
        href={href}
        className={`font-mono text-[11px] uppercase tracking-[0.16em] ${hoverStyles} ${isActive ? 'border-b border-black/70 pb-1 text-black' : 'text-black/52'}`}
        target={isExternal ? '_blank' : target}
        rel={isExternal ? 'noreferrer noopener' : rel}
        scroll={false}
      >
        {children}
      </Link>
    )
  }

  const [searchTerm, setSearchTerm] = useState("")
  const [searchResult, setSearchResult] = useState<{ type: string; uid: string } | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSearch = useMemo(
    () =>
      debounce(async (term: string) => {
        if (!term) {
          setSearchResult(null)
          setError(null)
          return
        }
        setIsLoading(true)
        setError(null)
        try {
          const attestationResponse = await fetchAttestation(term, currentChain, getNetwork() as any)
          if (attestationResponse.success && attestationResponse.data) {
            setSearchResult({ type: "attestation", uid: term })
            return
          }
          const response = await searchSchemas(currentChain, getNetwork() as any, { searchInput: term })
          const schemas = response.success ? response.data : []
          if (schemas && schemas.length > 0) {
            setSearchResult({ type: "schema", uid: term })
            return
          }
          setError("No results found")
        } catch (err) {
          setError("Error occurred during search")
        } finally {
          setIsLoading(false)
        }
      }, 300),
    [currentChain]
  )

  useEffect(() => {
    handleSearch(searchTerm)
    return () => {
      handleSearch.cancel()
    }
  }, [searchTerm, handleSearch])

  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    console.log('Select is open:', isOpen);
  }, [isOpen]);

  const chainSelector = (
    <Select.Root
      value={currentChain}
      onValueChange={(value) => {
        const chain = chains.find(n => n.chain === value);
        if (chain) handleChainChange(chain);
      }}
      onOpenChange={setIsOpen}
    >
      <Select.Trigger className="inline-flex h-10 items-center justify-center gap-2 border border-black/10 bg-white/72 px-3 py-2 text-sm leading-none transition-colors hover:bg-white focus:outline-none">
        <div className="flex items-center space-x-2">
          {selectedChain && (
            <>
              <Image src={selectedChain.icon} alt={selectedChain.name} width={20} height={20} className="border border-black/10" />
              <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-black/72">{selectedChain.name}</span>
            </>
          )}
        </div>
        <Select.Icon>
          <ChevronDownIcon className="h-4 w-4 text-black/42" />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content
          className="z-50 overflow-hidden border border-black/10 bg-white/96"
          position="popper"
          sideOffset={8}
          style={{ backgroundColor: 'rgba(255, 255, 255, 0.98)', backdropFilter: 'blur(20px)', minWidth: '280px' }}
        >
          <Select.Viewport className="p-2">
            <Select.Group>
              <Select.Label className="mb-2 border-b border-black/10 px-4 py-3 font-mono text-[10px] uppercase tracking-[0.16em] text-black/45">
                Choose Your Chain
              </Select.Label>
              {chains.map((chain) => (
                <Select.Item
                  key={chain.chain}
                  value={chain.chain}
                  className="relative flex h-12 cursor-pointer select-none items-center px-4 text-base text-black/75 transition-colors data-[disabled]:pointer-events-none data-[disabled]:text-black/30 data-[highlighted]:bg-[rgba(245,249,255,0.92)] data-[highlighted]:outline-none"
                >
                  <Select.ItemText>
                    <div className="flex items-center space-x-4">
                      <Image src={chain.icon} alt={chain.name} width={28} height={28} className="border border-black/10" />
                      <span className="font-mono text-[11px] uppercase tracking-[0.16em]">{chain.name}</span>
                    </div>
                  </Select.ItemText>
                  <Select.ItemIndicator className="absolute right-4 inline-flex items-center justify-center">
                    <div className="h-5 w-5 text-[#5f9bff]" />
                  </Select.ItemIndicator>
                </Select.Item>
              ))}
            </Select.Group>
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  )

  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768) // Set the mobile breakpoint to 768px
    }

    checkIfMobile()
    window.addEventListener('resize', checkIfMobile)

    return () => window.removeEventListener('resize', checkIfMobile)
  }, [])

  return (
    <header className="sticky top-0 z-50 flex h-auto flex-col items-center justify-between border-b border-black/10 bg-[rgba(248,251,255,0.9)] px-4 py-3 backdrop-blur-md md:h-16 md:flex-row md:py-0">
      <div className="flex items-center justify-between w-full md:w-auto">
        <a href="/dashboard" className="flex items-end text-lg font-bold md:text-base group">
          <span className="font-[family-name:var(--font-display)] text-[26px] leading-none tracking-[-0.025em] text-black transition-colors duration-300 group-hover:text-[#5f9bff] md:text-[30px]">
            Movera
          </span>
        </a>
        {!isMobile && (
          <nav className="ml-4 mr-2 hidden items-center gap-3 md:flex md:gap-4">
            <NavLink href="/attestations">Attestations</NavLink>
            <NavLink href="/schemas">Schemas</NavLink>
            {currentChain !== 'sui' && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className={`flex items-center gap-1 font-mono text-[11px] uppercase tracking-[0.16em] ${hoverStyles} text-black/52`}>
                    More <ChevronDownIcon className="h-3 w-3" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="min-w-[10rem]">
                  <DropdownMenuItem asChild>
                    <Link
                      href="/passport"
                      className="w-full font-mono text-[11px] uppercase tracking-[0.16em] text-black/72"
                    >
                      Passport
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </nav>
        )}
      </div>

      {!isMobile && (
        <div className="hidden md:flex flex-grow justify-center mx-2">
          <div className="relative w-full max-w-4xl">
            <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5f9bff]" />
            <Input
              type="search"
              placeholder="Search Attestation or Schema UID..."
              className="mv-input h-10 w-full border pl-10 text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {isLoading && (
              <div className="absolute top-full mt-3 w-full border border-black/10 bg-white/96 p-4 backdrop-blur-md"
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.98)',
                  opacity: 1
                }}
              >
                <div className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.16em] text-[#5f9bff]">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#5f9bff] border-t-transparent"></div>
                  Searching...
                </div>
              </div>
            )}
            {error && (
              <div className="absolute top-full mt-3 w-full border border-red-500/20 bg-red-50/90 p-4 text-red-700 backdrop-blur-md"
                style={{
                  backgroundColor: 'rgba(254, 242, 242, 0.9)',
                  opacity: 1
                }}
              >
                <div className="font-mono text-[11px] uppercase tracking-[0.16em]">{error}</div>
              </div>
            )}
            {searchResult && (
              <div
                className="absolute top-full mt-3 w-full border border-black/10 bg-white/96 p-4 backdrop-blur-md"
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.98)',
                  opacity: 1
                }}
              >
                <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[#5f9bff]">
                  View {searchResult.type}
                </div>
                <Link
                  href={`/${searchResult.type}/${searchResult.uid}`}
                  className={`font-primary text-base text-black ${hoverStyles}`}
                >
                  {searchResult.uid}
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex items-center gap-2">
        {!isMobile && (
          <div className="flex items-center gap-2">
            <Link
              href="https://github.com/HashIdea/movera"
              target="_blank"
              rel="noopener noreferrer"
              className="border border-black/10 px-3 py-2 transition-colors duration-200 hover:bg-white"
            >
              <GitHubIcon className="w-4 h-4" />
            </Link>
            <Link
              href="https://movera-docs.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center border border-black/10 px-3 py-2 transition-colors duration-200 hover:bg-white"
              aria-label="View Docs"
            >
              <LinkIcon className="w-4 h-4" />
              <span className="sr-only">Docs</span>
            </Link>
            <Link
              href="https://x.com/BoringIdea"
              target="_blank"
              rel="noopener noreferrer"
              className="border border-black/10 px-3 py-2 transition-colors duration-200 hover:bg-white"
            >
              <X className="w-4 h-4" />
            </Link>
          </div>
        )}
        {chainSelector}
        {currentChain === "sui" ? <ConnectButton /> : <WalletSelector />}
        {isMobile && (
          <button
            className="p-3 transition-colors duration-300 hover:bg-white md:hidden"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <Menu className="h-7 w-7 text-[#5f9bff]" />
          </button>
        )}
      </div>

      {isMobile && (
        <>
          <div className="w-full mt-6">
            <div className="relative w-full">
              <SearchIcon className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#5f9bff]" />
              <Input
                type="search"
                placeholder="Search Attestation or Schema UID..."
                className="mv-input h-14 w-full border pl-12 text-lg"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {isLoading && (
                <div className="absolute top-full mt-3 w-full border border-black/10 bg-white/96 p-4 backdrop-blur-md"
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.98)',
                    opacity: 1
                  }}
                >
                  <div className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.16em] text-[#5f9bff]">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#5f9bff] border-t-transparent"></div>
                    Searching...
                  </div>
                </div>
              )}
              {error && (
                <div className="absolute top-full mt-3 w-full border border-red-500/20 bg-red-50/90 p-4 text-red-700 backdrop-blur-md"
                  style={{
                    backgroundColor: 'rgba(254, 242, 242, 0.9)',
                    opacity: 1
                  }}
                >
                  <div className="font-mono text-[11px] uppercase tracking-[0.16em]">{error}</div>
                </div>
              )}
              {searchResult && (
                <div
                  className="absolute top-full mt-3 w-full border border-black/10 bg-white/96 p-4 backdrop-blur-md"
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.98)',
                    opacity: 1
                  }}
                >
                  <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[#5f9bff]">
                    View {searchResult.type}
                  </div>
                  <Link
                    href={`/${searchResult.type}/${searchResult.uid}`}
                    className={`font-primary text-base text-black ${hoverStyles}`}
                  >
                    {searchResult.uid}
                  </Link>
                </div>
              )}
            </div>
          </div>

          <nav className={`mt-6 flex w-full flex-col items-start gap-5 border border-black/10 bg-white/90 p-6 backdrop-blur-md ${isMenuOpen ? 'block' : 'hidden'}`}>
            <NavLink href="/attestations">Attestations</NavLink>
            <NavLink href="/schemas">Schemas</NavLink>
            {currentChain !== 'sui' && (
              <div className="flex flex-col items-start gap-3">
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-black/40">
                  More
                </span>
                <NavLink href="/passport">Passport</NavLink>
              </div>
            )}
            <div className="mt-6 flex items-center gap-4 border-t border-black/10 pt-6">
              <Link
                href="https://github.com/BoringIdea/movera"
                target="_blank"
                rel="noopener noreferrer"
                className="border border-black/10 px-3 py-2 transition-colors duration-200 hover:bg-white"
              >
                <GitHubIcon className="w-4 h-4" />
              </Link>
              <Link
                href="https://movera-docs.vercel.app/"
                target="_blank"
                rel="noopener noreferrer"
                className="border border-black/10 px-3 py-2 transition-colors duration-200 hover:bg-white"
              >
                <LinkIcon className="w-4 h-4" />
              </Link>
              <Link
                href="https://x.com/BoringIdea"
                target="_blank"
                rel="noopener noreferrer"
                className="border border-black/10 px-3 py-2 transition-colors duration-200 hover:bg-white"
              >
                <X className="w-4 h-4" />
              </Link>
            </div>
          </nav>
        </>
      )}
    </header>
  )
}
