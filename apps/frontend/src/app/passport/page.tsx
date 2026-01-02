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
    <div className="min-h-screen bg-[#F4F7FF] text-black">
      <Header />
      <main className="max-w-6xl mx-auto space-y-6 px-4 py-8">
        <section className="border border-black bg-white px-6 py-5 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.3em] text-black/60">Passport Profile</p>
              <h1 className="text-3xl font-black">Identity trusted on-chain</h1>
              <p className="text-sm font-bold text-black/60">Track your reputation and attestations with an immutable Passport.</p>
            </div>
            <div className="text-right space-y-2">
              {isWalletConnected ? (
                isRegistered ? (
                  <Link
                    href="/passport/score"
                    className="rounded-none border border-black bg-[#2792FF] px-5 py-2 text-sm font-black uppercase tracking-[0.2em] text-white inline-flex items-center justify-center"
                  >
                    View Score
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={registerPassport}
                    disabled={isRegistering || isWaitingForSignature}
                    className="rounded-none border border-black bg-[#2792FF] px-5 py-2 text-sm font-black uppercase tracking-[0.2em] text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isWaitingForSignature ? 'Waiting for signature' : isRegistering ? 'Registering...' : 'Register Passport'}
                  </button>
                )
              ) : (
                <span className="text-xs font-black uppercase tracking-[0.3em] text-black/50">Connect wallet to continue</span>
              )}
            </div>
          </div>
          {registrationError && (
            <div className="border border-black/30 bg-[#FFEFEF] px-4 py-3 text-sm font-bold text-red-600">
              {registrationError}
            </div>
          )}
        </section>

        <section className="grid gap-4 md:grid-cols-4">
          {[
            { label: 'Passport Score', value: passportData?.score ?? 0, accent: 'text-purple-600', icon: <Award className="w-5 h-5" /> },
            { label: 'Protocols', value: passportData?.protocols ?? 0, accent: 'text-blue-600', icon: <TrendingUp className="w-5 h-5" /> },
            { label: 'Volume', value: passportData?.volume ?? 0, accent: 'text-teal-600', icon: <Wallet className="w-5 h-5" /> },
            { label: 'Decibel Delta', value: decibelOverview?.score ?? 0, accent: 'text-black', icon: <TrendingUp className="w-5 h-5" /> },
          ].map((card) => (
            <div key={card.label} className="border border-black bg-white px-4 py-4 space-y-2">
              <div className="flex items-center justify-between text-xs font-black uppercase tracking-[0.3em] text-black/60">
                <span>{card.label}</span>
                {card.icon}
              </div>
              <p className={`text-3xl font-black ${card.accent}`}>{card.label === 'Volume' ? formatLargeNumber(card.value) : card.value?.toLocaleString?.() ?? card.value}</p>
            </div>
          ))}
        </section>

        <section className="border border-black bg-white px-6 py-5 space-y-5">
          <div className="space-y-2">
            <p className="text-xs font-black uppercase tracking-[0.3em] text-black/60">Protocol Explorer</p>
            <h3 className="text-2xl font-black">Discover and analyze DeFi protocols</h3>
          </div>
          <div className="grid gap-5 lg:grid-cols-3">
            <article className="border border-black bg-white px-5 py-5 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-black uppercase tracking-[0.3em] text-black/60">Decibel</p>
                  <p className="text-sm text-black/70">Perp DEX analytics and insights</p>
                </div>
                <span className="h-8 w-8 border border-black bg-[#F4F7FF] flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-[#2792FF]" />
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {overviewCards.map((card) => (
                  <div key={card.label} className={`border border-black ${card.background} px-3 py-2 space-y-1`}>
                    <p className="text-[0.65rem] font-black uppercase tracking-[0.3em] text-black/60">{card.label}</p>
                    <p className="text-lg font-black text-black">{card.value}</p>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between text-xs font-black uppercase tracking-[0.2em] text-black/60">
                <span>Live now</span>
                <Link href="/passport/protocol/decibel" className="rounded-none border border-black bg-black px-4 py-2 text-white">
                  View Decibel
                </Link>
              </div>
            </article>
            {[1, 2].map((index) => (
              <article key={index} className="border border-black/40 bg-[#F9FBFF] px-5 py-5 space-y-3 text-black/60">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-black uppercase tracking-[0.3em]">More protocols</p>
                  <span className="h-8 w-8 border border-black/40 flex items-center justify-center rounded-full text-xs">•••</span>
                </div>
                <p className="text-sm font-bold">Coming soon...</p>
                <p className="text-[0.65rem]">Additional protocols will be added here</p>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}
