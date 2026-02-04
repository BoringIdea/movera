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

const hoverStyles = "transition-colors duration-200 hover:text-[#2792FF]"

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
        className={`text-xs font-black uppercase tracking-[0.2em] ${hoverStyles} ${isActive ? 'text-black border-b-2 border-black pb-1' : 'text-black/60'}`}
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
      <Select.Trigger className="inline-flex items-center justify-center px-3 py-2 text-sm leading-none h-10 gap-2 bg-gradient-to-r from-blue-100/80 to-indigo-100/80 hover:from-blue-200/80 hover:to-indigo-200/80 rounded-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-300/50 border-2 border-blue-200/70 hover:border-blue-300/70 shadow-md hover:shadow-lg">
        <div className="flex items-center space-x-2">
          {selectedChain && (
            <>
              <Image src={selectedChain.icon} alt={selectedChain.name} width={20} height={20} className="rounded-full shadow-sm" />
              <span className="font-bold text-blue-800 text-sm">{selectedChain.name}</span>
            </>
          )}
        </div>
        <Select.Icon>
          <ChevronDownIcon className="w-4 h-4 text-blue-600" />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content
          className="overflow-hidden rounded-xl shadow-2xl border-2 border-blue-200/70 z-50"
          position="popper"
          sideOffset={8}
          style={{ backgroundColor: 'rgba(255, 255, 255, 0.98)', backdropFilter: 'blur(20px)', minWidth: '280px' }}
        >
          <Select.Viewport className="p-2">
            <Select.Group>
              <Select.Label className="px-4 py-3 text-base text-blue-700 font-bold border-b border-blue-200/50 mb-2">
                Choose Your Chain
              </Select.Label>
              {chains.map((chain) => (
                <Select.Item
                  key={chain.chain}
                  value={chain.chain}
                  className="text-base text-gray-800 rounded-xl flex items-center h-12 px-4 relative select-none data-[disabled]:text-gray-400 data-[disabled]:pointer-events-none data-[highlighted]:outline-none data-[highlighted]:bg-gradient-to-r data-[highlighted]:from-blue-100/70 data-[highlighted]:to-indigo-100/70 cursor-pointer transition-all duration-200 hover:shadow-md"
                >
                  <Select.ItemText>
                    <div className="flex items-center space-x-4">
                      <Image src={chain.icon} alt={chain.name} width={28} height={28} className="rounded-full shadow-sm" />
                      <span className="font-semibold">{chain.name}</span>
                    </div>
                  </Select.ItemText>
                  <Select.ItemIndicator className="absolute right-4 inline-flex items-center justify-center">
                    <div className="w-5 h-5 text-blue-600" />
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
    <header className="flex flex-col md:flex-row items-center justify-between h-auto md:h-16 px-4 py-3 md:py-0 border-b-2 border-blue-200/50 backdrop-blur-md bg-white/95 sticky top-0 z-50 shadow-lg">
      <div className="flex items-center justify-between w-full md:w-auto">
        <a href="/dashboard" className="flex items-center gap-2 text-lg font-bold md:text-base group">
          <div className="w-20 h-10 md:w-24 md:h-12 relative transition-all duration-300 group-hover:scale-110 group-hover:shadow-xl">
            <Image
              src="/mas-logo.jpg"
              alt="Movera Logo"
              fill
              style={{ objectFit: 'contain' }}
              className="transition-all duration-300 group-hover:opacity-90"
            />
          </div>
          <span className="sr-only">Movera</span>
        </a>
        {!isMobile && (
          <nav className="hidden md:flex items-center gap-3 text-xs font-black uppercase tracking-[0.2em] md:gap-4 ml-4 mr-2">
            <NavLink href="/attestations">Attestations</NavLink>
            <NavLink href="/schemas">Schemas</NavLink>
            {currentChain !== 'sui' && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className={`flex items-center gap-1 text-xs font-black uppercase tracking-[0.2em] ${hoverStyles} text-black/60`}>
                    More <ChevronDownIcon className="h-3 w-3" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="min-w-[10rem]">
                  <DropdownMenuItem asChild>
                    <Link
                      href="/passport"
                      className="w-full text-xs font-black uppercase tracking-[0.2em] text-black/80"
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
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-500" />
            <Input
              type="search"
              placeholder="Search Attestation or Schema UID..."
              className="pl-10 w-full h-10 text-sm rounded-xl border-2 border-blue-300/70 focus:border-blue-500 focus:ring-2 focus:ring-blue-200/50 transition-all duration-300 bg-white/90 backdrop-blur-sm shadow-md hover:shadow-lg"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {isLoading && (
              <div className="absolute top-full mt-3 bg-white/98 backdrop-blur-md shadow-2xl p-4 rounded-2xl w-full border-2 border-blue-200/70"
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.98)',
                  opacity: 1
                }}
              >
                <div className="flex items-center gap-3 text-blue-700 font-semibold text-lg">
                  <div className="w-5 h-5 border-3 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  Searching...
                </div>
              </div>
            )}
            {error && (
              <div className="absolute top-full mt-3 bg-red-50/90 text-red-700 p-4 rounded-2xl w-full border-2 border-red-200/70 backdrop-blur-md shadow-2xl"
                style={{
                  backgroundColor: 'rgba(254, 242, 242, 0.9)',
                  opacity: 1
                }}
              >
                <div className="font-semibold text-lg">{error}</div>
              </div>
            )}
            {searchResult && (
              <div
                className="absolute top-full mt-3 bg-white/98 backdrop-blur-md shadow-2xl p-4 rounded-2xl w-full border-2 border-blue-200/70"
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.98)',
                  opacity: 1
                }}
              >
                <div className="text-blue-700 text-lg mb-2 font-bold">
                  View {searchResult.type}
                </div>
                <Link
                  href={`/${searchResult.type}/${searchResult.uid}`}
                  className={`text-blue-700 hover:text-blue-800 font-bold text-lg ${hoverStyles}`}
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
              className="border border-black px-3 py-2 rounded-none hover:bg-black/5 transition-colors duration-200"
            >
              <GitHubIcon className="w-4 h-4" />
            </Link>
            <Link
              href="https://movera-docs.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center border border-black px-3 py-2 rounded-none hover:bg-black/5 transition-colors duration-200"
              aria-label="View Docs"
            >
              <LinkIcon className="w-4 h-4" />
              <span className="sr-only">Docs</span>
            </Link>
            <Link
              href="https://x.com/movera_protocol"
              target="_blank"
              rel="noopener noreferrer"
              className="border border-black px-3 py-2 rounded-none hover:bg-black/5 transition-colors duration-200"
            >
              <X className="w-4 h-4" />
            </Link>
          </div>
        )}
        {chainSelector}
        {currentChain === "sui" ? <ConnectButton /> : <WalletSelector />}
        {isMobile && (
          <button
            className="md:hidden p-3 rounded-xl hover:bg-gradient-to-r hover:from-blue-100/80 hover:to-indigo-100/80 transition-all duration-300 shadow-md hover:shadow-lg"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <Menu className="w-7 h-7 text-blue-700" />
          </button>
        )}
      </div>

      {isMobile && (
        <>
          <div className="w-full mt-6">
            <div className="relative w-full">
              <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-blue-500" />
              <Input
                type="search"
                placeholder="Search Attestation or Schema UID..."
                className="pl-12 w-full h-14 text-lg rounded-2xl border-2 border-blue-300/70 focus:border-blue-500 focus:ring-4 focus:ring-blue-200/50 transition-all duration-300 bg-white/90 backdrop-blur-sm shadow-lg"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {isLoading && (
                <div className="absolute top-full mt-3 bg-white/98 backdrop-blur-md shadow-2xl p-4 rounded-2xl w-full border-2 border-blue-200/70"
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.98)',
                    opacity: 1
                  }}
                >
                  <div className="flex items-center gap-3 text-blue-700 font-semibold text-lg">
                    <div className="w-5 h-5 border-3 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    Searching...
                  </div>
                </div>
              )}
              {error && (
                <div className="absolute top-full mt-3 bg-red-50/90 text-red-700 p-4 rounded-2xl w-full border-2 border-red-200/70 backdrop-blur-md shadow-2xl"
                  style={{
                    backgroundColor: 'rgba(254, 242, 242, 0.9)',
                    opacity: 1
                  }}
                >
                  <div className="font-semibold text-lg">{error}</div>
                </div>
              )}
              {searchResult && (
                <div
                  className="absolute top-full mt-3 bg-white/98 backdrop-blur-md shadow-2xl p-4 rounded-2xl w-full border-2 border-blue-200/70"
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.98)',
                    opacity: 1
                  }}
                >
                  <div className="text-blue-700 text-lg mb-2 font-bold">
                    View {searchResult.type}
                  </div>
                  <Link
                    href={`/${searchResult.type}/${searchResult.uid}`}
                    className={`text-blue-700 hover:text-blue-800 font-bold text-lg ${hoverStyles}`}
                  >
                    {searchResult.uid}
                  </Link>
                </div>
              )}
            </div>
          </div>

          <nav className={`w-full mt-6 flex flex-col items-start gap-5 p-6 rounded-2xl bg-gradient-to-br from-blue-50/50 to-indigo-50/50 backdrop-blur-md border-2 border-blue-200/50 shadow-lg ${isMenuOpen ? 'block' : 'hidden'}`}>
            <NavLink href="/attestations">Attestations</NavLink>
            <NavLink href="/schemas">Schemas</NavLink>
            {currentChain !== 'sui' && (
              <div className="flex flex-col items-start gap-3">
                <span className="text-[0.6rem] font-black uppercase tracking-[0.3em] text-black/40">
                  More
                </span>
                <NavLink href="/passport">Passport</NavLink>
              </div>
            )}
            <div className="flex items-center gap-4 mt-6 pt-6 border-t-2 border-blue-200/50">
              <Link
                href="https://github.com/BoringIdea/movera"
                target="_blank"
                rel="noopener noreferrer"
                className="border border-black px-3 py-2 rounded-none hover:bg-black/5 transition-colors duration-200"
              >
                <GitHubIcon className="w-4 h-4" />
              </Link>
              <Link
                href="https://movera-docs.vercel.app/"
                target="_blank"
                rel="noopener noreferrer"
                className="border border-black px-3 py-2 rounded-none hover:bg-black/5 transition-colors duration-200"
              >
                <LinkIcon className="w-4 h-4" />
              </Link>
              <Link
                href="https://www.x.com/movera_protocol"
                target="_blank"
                rel="noopener noreferrer"
                className="border border-black px-3 py-2 rounded-none hover:bg-black/5 transition-colors duration-200"
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
