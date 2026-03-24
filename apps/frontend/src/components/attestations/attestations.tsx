'use client'

import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Header } from '@/components/header'
import { useState, useEffect } from 'react'
import { SuiAttestationTable } from '@/components/attestations/sui-attestation-table'
import { AptosAttestationTable } from '@/components/attestations/aptos-attestation-table'
import { fetchAttestations } from '@/api/attestation';
import { useChain } from "@/components/providers/chain-provider"
import { getNetwork } from '@/utils/utils';
import { AttestationWithSchema } from '@/api/types';

export function Attestations({
  chain,
  attestorCnt,
  attestationCnt
}: {
  chain: string,
  attestorCnt: number,
  attestationCnt: number
}) {
  const router = useRouter()
  const { currentChain } = useChain();
  const network = getNetwork();

  const [attestations, setAttestations] = useState<AttestationWithSchema[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20
  const totalPages = Math.max(1, Math.ceil(attestationCnt / itemsPerPage))

  useEffect(() => {
    const fetchDatas = async () => {
      setIsLoading(true);
      try {
        const offset = (currentPage - 1) * itemsPerPage;
        const response = await fetchAttestations(currentChain as any, network as any, { offset, limit: itemsPerPage });
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

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <Header />
      <main className="mv-shell space-y-6 py-8">
        <section className="mv-panel-muted flex flex-col gap-4 px-6 py-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mv-kicker">Attestation Ledger</p>
            <h1 className="mv-title mt-3 text-3xl md:text-4xl">{formattedChain} Attestations</h1>
            <p className="mv-copy mt-3 max-w-2xl">Structured attestations, recent issuance, and attestor activity across the current chain.</p>
          </div>
          <Button
            variant="default"
            className="mv-btn-primary h-11 px-5"
            onClick={() => router.push('/schema/search')}
          >
            CREATE ATTESTATION
          </Button>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          {[{
            title: 'Total Attestations',
            value: attestationCnt,
            detail: 'Created attestations',
            gradient: 'linear-gradient(180deg, #f7f8ff 0%, #dbe7ff 100%)'
          }, {
            title: 'Active Attestors',
            value: attestorCnt,
            detail: 'Unique attestors',
            gradient: 'linear-gradient(180deg, #fff6ef 0%, #ffe7c8 100%)'
          }].map((card) => (
            <div key={card.title} className="mv-panel space-y-3 px-5 py-4" style={{ backgroundImage: card.gradient }}>
              <div className="inline-flex border border-black/10 bg-white/80 px-3 py-1">
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-black/45">{card.title}</p>
              </div>
              <p className="font-[family-name:var(--font-display)] text-4xl leading-none text-black">{card.value?.toLocaleString() ?? '0'}</p>
              <p className="mv-copy text-sm">{card.detail}</p>
            </div>
          ))}
        </section>

        <section className="mv-panel">
          <div className="border-b border-black/10 px-6 py-4">
            <p className="mv-kicker">Recent Attestations</p>
            <h2 className="mv-heading mt-2">Latest entries</h2>
          </div>
          <div className="px-0 py-6">
            {isLoading ? (
              <div className="flex justify-center py-10 font-mono text-xs uppercase tracking-[0.16em] text-black/45">Loading attestations...</div>
            ) : (
              <>{chain === 'sui' ? <SuiAttestationTable attestations={attestations} /> : <AptosAttestationTable attestations={attestations} />}</>
            )}
          </div>
        </section>

        {totalPages > 1 && (
          <div className="flex justify-center">
            <div className="mv-panel flex flex-wrap items-center justify-center gap-2 px-4 py-3 font-mono text-[10px] uppercase tracking-[0.16em] text-black/65">
              <button
                type="button"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1 || isLoading}
                className="mv-btn-secondary h-9 px-3 disabled:cursor-not-allowed disabled:opacity-50"
              >
                FIRST
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1 || isLoading}
                className="mv-btn-secondary h-9 px-3 disabled:cursor-not-allowed disabled:opacity-50"
              >
                &lt;
              </button>
              <span className="px-3 py-1">Page {currentPage} of {totalPages}</span>
              <button
                type="button"
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages || isLoading}
                className="mv-btn-secondary h-9 px-3 disabled:cursor-not-allowed disabled:opacity-50"
              >
                &gt;
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages || isLoading}
                className="mv-btn-secondary h-9 px-3 disabled:cursor-not-allowed disabled:opacity-50"
              >
                LAST
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
