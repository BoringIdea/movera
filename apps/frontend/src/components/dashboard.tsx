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
    <div className="mv-shell">
      <Header />
      <main className="border-t border-black/10 px-4 pb-10 pt-6 md:px-6">
        <div className="mv-frame space-y-6">
          <section className="mv-panel flex flex-col gap-4 px-6 py-6 md:flex-row md:items-end md:justify-between">
            <div className="space-y-2">
              <p className="mv-kicker">Ledger Overview</p>
              <h1 className="mv-title text-3xl md:text-4xl">Movera Protocol Dashboard</h1>
              <p className="mv-copy">
                Chain: {formattedChain} · Network: {network ?? 'mainnet'}
              </p>
            </div>
            <div className="flex flex-col items-start gap-2 text-right md:items-end">
              <span className="mv-accent-tag">
                Live
              </span>
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-black/45">Last synced {lastSyncedTime}</p>
              <button
                type="button"
                onClick={() => router.push('/schema/search')}
                className="mv-btn-primary"
              >
                Start attestation
              </button>
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-3">
            {[
              {
                title: 'Total Attestations',
                value: attestationCount,
                label: 'Created attestations',
                tone: 'bg-[rgba(238,245,255,0.9)]'
              },
              {
                title: 'Unique Attestors',
                value: attestorCount,
                label: 'Active attestors',
                tone: 'bg-white/88'
              },
              {
                title: 'Schemas',
                value: schemaCount,
                label: 'Available schemas',
                tone: 'bg-[rgba(243,248,255,0.92)]'
              },
            ].map((card) => (
              <div key={card.title} className={`mv-panel px-4 py-5 text-black ${card.tone}`}>
                <div className="mv-tag mb-3 bg-white/70">
                  <p>{card.title}</p>
                </div>
                <p className="mv-heading text-4xl">{card.value?.toLocaleString() ?? '0'}</p>
                <p className="mt-2 text-sm text-black/55">{card.label}</p>
              </div>
            ))}
          </section>

          <section className="mv-panel space-y-4 px-6 py-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="mv-kicker">Status & history</p>
                <h2 className="mv-heading">Recent confirmations</h2>
              </div>
              <span className="mv-accent-tag">
                Attested
              </span>
            </div>
            <div className="space-y-3">
              {timelineEvents.length > 0 ? (
                timelineEvents.map((event) => (
                  <div
                    key={`${event.title}-${event.time}`}
                    className="flex flex-col border border-black/10 bg-white/72 px-4 py-3 md:flex-row md:items-center md:justify-between"
                  >
                    <div className="flex-1 space-y-1">
                      <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-black">{event.title}</p>
                      <p className="text-sm text-black/62">{event.detail}</p>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-black">
                      <span>{event.time}</span>
                      <span className="mv-accent-tag">
                        {formattedChain}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-black/55">No attestation events available yet.</p>
              )}
            </div>
          </section>

          <section className="mv-panel">
            <div className="border-b border-black/10 px-6 py-4">
              <p className="mv-kicker">Latest entries</p>
              <h2 className="mv-heading">Recent attestations</h2>
              <p className="mt-1 text-sm text-black/55">
                Latest {formattedChain} Attestation activity recorded on-chain
              </p>
            </div>
            <div className="px-0 py-6">
              {isLoading ? (
                <div className="flex justify-center py-10 font-mono text-[11px] uppercase tracking-[0.16em] text-black/45">
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
              <div className="mv-panel flex flex-wrap items-center justify-center gap-2 px-4 py-3 font-mono text-[10px] uppercase tracking-[0.16em] text-black/72">
                <button
                  type="button"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1 || isLoading}
                  className="border border-black/10 bg-white/72 px-3 py-1 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  first
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1 || isLoading}
                  className="border border-black/10 bg-white/72 px-3 py-1 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  &lt;
                </button>
                <span className="px-3 py-1 text-black">
                  Page {currentPage} of {totalPages} ({attestationCount} total)
                </span>
                <button
                  type="button"
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages || isLoading}
                  className="border border-black/10 bg-white/72 px-3 py-1 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  &gt;
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages || isLoading}
                  className="border border-black/10 bg-white/72 px-3 py-1 disabled:cursor-not-allowed disabled:opacity-50"
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
