'use client'

import { Header } from '@/components/header'
import { useDecibelOverview } from '@/hooks/useDecibelOverview'
import { TrendingUp, Award, Wallet } from 'lucide-react'
import { useCurrentAccount } from '@mysten/dapp-kit'
import { useWallet } from '@aptos-labs/wallet-adapter-react'
import { usePassportRegistration } from '@/hooks/usePassportRegistration'
import { useChain } from '@/components/providers/chain-provider'
import { usePassportOverview } from '@/hooks/usePassportData'
import Link from 'next/link'

export default function PassportHomePage() {
  const { data: decibelOverview } = useDecibelOverview()
  const { currentChain } = useChain()
  const suiAccount = useCurrentAccount()
  const { account: aptosAccount } = useWallet()
  const isWalletConnected = currentChain === 'sui' ? !!suiAccount : !!aptosAccount
  const currentUserAddress = currentChain === 'sui' ? suiAccount?.address : aptosAccount?.address

  const { isRegistered, error: registrationError, registerPassport, isRegistering, isWaitingForSignature } = usePassportRegistration()
  const { data: passportData } = usePassportOverview(currentUserAddress || '', currentChain || 'aptos')

  const formatLargeNumber = (value?: number) => {
    if (value === undefined || value === null) return '$0'
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
    if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}`
    return `$${value.toFixed(2)}`
  }

  const breakdown = passportData?.breakdown ?? {}
  const overviewCards = [
    {
      label: '24h Volume',
      value: formatLargeNumber(decibelOverview?.total24hVolume),
      background: 'bg-[#D0E8FF]',
    },
    {
      label: 'Open Interest',
      value: formatLargeNumber(decibelOverview?.totalOpenInterest),
      background: 'bg-[#E2FFE1]',
    },
    {
      label: 'Active Markets',
      value:
        decibelOverview && decibelOverview.totalMarkets >= 0
          ? `${decibelOverview.activeMarkets}/${decibelOverview.totalMarkets}`
          : '0/0',
      background: 'bg-[#FFF3DF]',
    },
    {
      label: 'Traders',
      value: decibelOverview?.activeTraders?.toLocaleString() ?? '0',
      background: 'bg-[#FFE5E1]',
    },
  ]

  return (
    <div className="mv-shell">
      <Header />
      <main className="mv-frame space-y-6 py-8">
        <section className="mv-panel space-y-4 px-6 py-5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <p className="mv-kicker">Passport Profile</p>
              <h1 className="mv-title text-3xl md:text-4xl">Identity trusted on-chain</h1>
              <p className="mv-copy">Track your reputation and attestations with an immutable Passport.</p>
            </div>
            <div className="text-right space-y-2">
              {isWalletConnected ? (
                isRegistered ? (
                  <Link
                    href="/passport/score"
                    className="mv-btn-primary inline-flex"
                  >
                    View Score
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={registerPassport}
                    disabled={isRegistering || isWaitingForSignature}
                    className="mv-btn-primary disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isWaitingForSignature ? 'Waiting for signature' : isRegistering ? 'Registering...' : 'Register Passport'}
                  </button>
                )
              ) : (
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-black/45">Connect wallet to continue</span>
              )}
            </div>
          </div>
          {registrationError && (
            <div className="border border-[#efc0b8] bg-[#fff2ef] px-4 py-3 font-mono text-xs uppercase tracking-[0.14em] text-[#b42318]">
              {registrationError}
            </div>
          )}
        </section>

        <section className="grid gap-4 md:grid-cols-4">
          {[
            { label: 'Passport Score', value: passportData?.score ?? 0, accent: 'text-[#5842b0]', icon: <Award className="w-5 h-5" /> },
            { label: 'Protocols', value: passportData?.protocols ?? 0, accent: 'text-[#1f4ea3]', icon: <TrendingUp className="w-5 h-5" /> },
            { label: 'Volume', value: passportData?.volume ?? 0, accent: 'text-[#18794e]', icon: <Wallet className="w-5 h-5" /> },
            { label: 'Decibel Delta', value: decibelOverview?.score ?? 0, accent: 'text-black', icon: <TrendingUp className="w-5 h-5" /> },
          ].map((card) => (
            <div key={card.label} className="mv-panel px-4 py-4 space-y-2">
              <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.16em] text-black/45">
                <span>{card.label}</span>
                {card.icon}
              </div>
              <p className={`mv-heading text-3xl ${card.accent}`}>{card.label === 'Volume' ? formatLargeNumber(card.value) : card.value?.toLocaleString?.() ?? card.value}</p>
            </div>
          ))}
        </section>

        <section className="mv-panel space-y-5 px-6 py-5">
          <div className="space-y-2">
            <p className="mv-kicker">Protocol Explorer</p>
            <h3 className="mv-heading">Discover and analyze DeFi protocols</h3>
          </div>
          <div className="grid gap-5 lg:grid-cols-3">
            <article className="mv-panel px-5 py-5 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-black/45">Decibel</p>
                  <p className="text-sm text-black/70">Perp DEX analytics and insights</p>
                </div>
                <span className="flex h-8 w-8 items-center justify-center border border-black/10 bg-[rgba(245,249,255,0.92)]">
                  <TrendingUp className="h-5 w-5 text-[#5f9bff]" />
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {overviewCards.map((card) => (
                  <div key={card.label} className={`border border-black/10 ${card.background} px-3 py-2 space-y-1`}>
                    <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-black/45">{card.label}</p>
                    <p className="mv-heading text-[1.45rem]">{card.value}</p>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.16em] text-black/45">
                <span>Live now</span>
                <Link href="/passport/protocol/decibel" className="mv-btn-secondary px-4 py-2 text-black">
                  View Decibel
                </Link>
              </div>
            </article>
            {[1, 2].map((index) => (
              <article key={index} className="border border-black/10 bg-[rgba(245,249,255,0.92)] px-5 py-5 space-y-3 text-black/60">
                <div className="flex items-center justify-between">
                  <p className="font-mono text-[10px] uppercase tracking-[0.16em]">More protocols</p>
                  <span className="flex h-8 w-8 items-center justify-center border border-black/10 text-xs">•••</span>
                </div>
                <p className="text-sm">Coming soon...</p>
                <p className="font-mono text-[10px] uppercase tracking-[0.16em]">Additional protocols will be added here</p>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}
