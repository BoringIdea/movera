'use client'

import { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { useRouter } from 'next/navigation'
import { Header } from "@/components/header";
import { SuiAttestationTable } from '@/components/attestations/sui-attestation-table';
import { AptosAttestationTable } from '@/components/attestations/aptos-attestation-table';
import { fetchAttestations } from '@/api/attestation';
import { useChain } from "@/components/providers/chain-provider"
import { getNetwork } from "@/utils/utils";
import { AttestationWithSchema } from "@/api/types";

export function Dashboard({
  chain,
  attestorCount,
  attestationCount,
  schemaCount
}: {
  chain: string;
  attestorCount: number;
  attestationCount: number;
  schemaCount: number;
}) {
  const router = useRouter();
  const { currentChain } = useChain();
  const network = getNetwork();

  const [attestations, setAttestations] = useState<AttestationWithSchema[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  const totalPages = Math.ceil(attestationCount / itemsPerPage);

  useEffect(() => {
    const fetchDatas = async () => {
      setIsLoading(true);
      try {
        const offset = (currentPage - 1) * itemsPerPage;
        const response = await fetchAttestations(currentChain, network as any, { offset, limit: itemsPerPage });
        if (response.success) {
          setAttestations(response.data);
        } else {
          console.error('Failed to fetch attestations:', response.message);
          setAttestations([]);
        }
      } catch (error) {
        console.error('Error fetching attestations:', error);
        setAttestations([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDatas();
  }, [currentPage, itemsPerPage, currentChain, network]);

  const formattedChain = chain.charAt(0).toUpperCase() + chain.slice(1);
  const lastSyncedTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const parseAttestationTimestamp = (value?: string) => {
    const numeric = Number(value ?? 0);
    if (!Number.isFinite(numeric) || numeric <= 0) {
      return new Date();
    }
    return numeric > 1e12 ? new Date(numeric) : new Date(numeric * 1000);
  };

  const shortAddress = (address?: string) => {
    if (!address) return '—';
    if (address.length <= 12) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const timelineEvents = attestations.slice(0, 3).map((attestation) => ({
    title: attestation.schema_name || `Schema #${attestation.schema_id ?? '—'}`,
    detail: `${shortAddress(attestation.attestor)} → ${shortAddress(attestation.recipient)}`,
    time: formatDistanceToNow(parseAttestationTimestamp(attestation.time), { addSuffix: true }),
  }));

  return (
    <div className="min-h-screen bg-[#F4F7FF] text-black">
      <Header />
      <main className="flex flex-col items-center border-t border-black bg-[#F4F7FF] px-4 pb-10 pt-6">
        <div className="w-full max-w-6xl space-y-6">
          <section className="flex flex-col gap-4 border border-black bg-white px-6 py-5 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-black/70">Ledger Overview</p>
              <h1 className="text-3xl font-black tracking-tight text-black">Movera Protocol Dashboard</h1>
              <p className="text-sm font-bold text-black/80">
                Chain: {formattedChain} · Network: {network ?? 'mainnet'}
              </p>
            </div>
            <div className="flex flex-col items-start gap-2 text-right text-sm font-bold md:items-end">
              <span className="rounded-none border border-black bg-[#D0E8FF] px-3 py-1 text-xs uppercase tracking-[0.2em] text-[#2792FF]">
                Live
              </span>
              <p className="text-xs uppercase tracking-[0.2em] text-black/70">Last synced {lastSyncedTime}</p>
              <button
                type="button"
                onClick={() => router.push('/schema/search')}
                className="rounded-none border border-black bg-[#2792FF] px-5 py-2 text-sm font-bold uppercase tracking-[0.15em] text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black"
              >
                Start attestation
              </button>
            </div>
          </section>

          <section className="grid gap-4 border border-black bg-white px-4 py-4 md:grid-cols-3">
            {[
              {
                title: 'Total Attestations',
                value: attestationCount,
                label: 'Created attestations',
                gradient: 'linear-gradient(180deg, #f7f8ff 0%, #dbe7ff 100%)'
              },
              {
                title: 'Unique Attestors',
                value: attestorCount,
                label: 'Active attestors',
                gradient: 'linear-gradient(180deg, #fff6ef 0%, #ffe7c8 100%)'
              },
              {
                title: 'Schemas',
                value: schemaCount,
                label: 'Available schemas',
                gradient: 'linear-gradient(180deg, #effffe 0%, #d8ffe2 100%)'
              },
            ].map((card) => (
              <div key={card.title} className="border border-black px-4 py-4 text-black" style={{ backgroundImage: card.gradient }}>
                <div className="inline-flex px-3 py-1 rounded-none border border-black mb-3 bg-white/70">
                  <p className="text-[0.65rem] font-black uppercase tracking-[0.25em] text-black/70">{card.title}</p>
                </div>
                <p className="text-3xl font-black text-black">{card.value?.toLocaleString() ?? '0'}</p>
                <p className="text-xs font-bold text-black/60">{card.label}</p>
              </div>
            ))}
          </section>

          <section className="space-y-4 border border-black bg-white px-6 py-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.3em] text-black/70">Status & history</p>
                <h2 className="text-xl font-black text-black">Recent confirmations</h2>
              </div>
              <span className="rounded-none border border-black bg-[#D0E8FF] px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-black">
                Attested
              </span>
            </div>
            <div className="space-y-3">
              {timelineEvents.length > 0 ? (
                timelineEvents.map((event) => (
                  <div
                    key={`${event.title}-${event.time}`}
                    className="flex flex-col border-l-4 border-black bg-white px-4 py-3 md:flex-row md:items-center md:justify-between"
                  >
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-black uppercase tracking-[0.2em] text-black">{event.title}</p>
                      <p className="text-xs font-bold text-black/70">{event.detail}</p>
                    </div>
                    <div className="flex items-center gap-3 text-xs font-bold text-black">
                      <span>{event.time}</span>
                      <span className="rounded-none border border-black bg-[#D0E8FF] px-3 py-1 text-[0.65rem] uppercase tracking-[0.2em] text-black">
                        {formattedChain}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm font-bold text-black/60">No attestation events available yet.</p>
              )}
            </div>
          </section>

          <section className="border border-black bg-white">
            <div className="border-b border-black px-6 py-4">
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-black/70">Latest entries</p>
              <h2 className="text-2xl font-black text-black">Recent attestations</h2>
              <p className="text-xs font-bold text-black/70">
                Latest {formattedChain} Attestation activity recorded on-chain
              </p>
            </div>
            <div className="px-0 py-6">
              {isLoading ? (
                <div className="flex justify-center py-10 text-sm font-bold text-black/60">
                  Loading recent attestations...
                </div>
              ) : (
                <>
                  {chain === 'sui' ? (
                    <SuiAttestationTable attestations={attestations} />
                  ) : (
                    <AptosAttestationTable attestations={attestations} />
                  )}
                </>
              )}
            </div>
          </section>

          {totalPages > 1 && (
            <div className="flex justify-center">
              <div className="flex flex-wrap items-center justify-center gap-2 border border-black bg-white px-4 py-3 text-xs font-bold uppercase tracking-[0.2em] text-black">
                <button
                  type="button"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1 || isLoading}
                  className="rounded-none border border-black bg-white px-3 py-1 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-50"
                >
                  first
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1 || isLoading}
                  className="rounded-none border border-black bg-white px-3 py-1 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-50"
                >
                  &lt;
                </button>
                <span className="px-3 py-1 text-xs font-bold text-black">
                  Page {currentPage} of {totalPages} ({attestationCount} total)
                </span>
                <button
                  type="button"
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages || isLoading}
                  className="rounded-none border border-black bg-white px-3 py-1 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-50"
                >
                  &gt;
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages || isLoading}
                  className="rounded-none border border-black bg-white px-3 py-1 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-50"
                >
                  last
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
