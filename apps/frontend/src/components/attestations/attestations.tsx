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
    <div className="min-h-screen bg-[#F4F7FF] text-black">
      <Header />
      <main className="max-w-6xl mx-auto space-y-6 px-4 py-8">
        <section className="border border-black bg-white px-6 py-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.3em] text-black/70">Attestation Ledger</p>
            <h1 className="text-3xl font-black text-black">{formattedChain} Attestations</h1>
            <p className="text-sm font-bold text-black/60">Real-time record of attestations produced on-chain.</p>
          </div>
          <Button
            variant="default"
            className="rounded-none border border-black bg-[#2792FF] text-white font-black tracking-[0.2em] px-5 py-2 text-xs"
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
            <div key={card.title} className="border border-black px-5 py-4" style={{ backgroundImage: card.gradient }}>
              <div className="inline-flex px-3 py-1 rounded-none border border-black bg-white/80 mb-3">
                <p className="text-[0.65rem] font-black uppercase tracking-[0.3em] text-black/60">{card.title}</p>
              </div>
              <p className="text-3xl font-black text-black">{card.value?.toLocaleString() ?? '0'}</p>
              <p className="text-xs font-bold text-black/60">{card.detail}</p>
            </div>
          ))}
        </section>

        <section className="border border-black bg-white">
          <div className="border-b border-black px-6 py-4">
            <p className="text-xs font-black uppercase tracking-[0.3em] text-black/70">Recent Attestations</p>
            <h2 className="text-2xl font-black text-black">Latest entries</h2>
          </div>
          <div className="px-0 py-6">
            {isLoading ? (
              <div className="flex justify-center py-10 text-sm font-black text-black/60">Loading attestations...</div>
            ) : (
              <>{chain === 'sui' ? <SuiAttestationTable attestations={attestations} /> : <AptosAttestationTable attestations={attestations} />}</>
            )}
          </div>
        </section>

        {totalPages > 1 && (
          <div className="flex justify-center">
            <div className="flex flex-wrap items-center justify-center gap-2 border border-black bg-white px-4 py-3 text-xs font-black tracking-[0.2em] text-black">
              <button
                type="button"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1 || isLoading}
                className="rounded-none border border-black px-3 py-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                FIRST
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1 || isLoading}
                className="rounded-none border border-black px-3 py-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                &lt;
              </button>
              <span className="px-3 py-1 text-xs font-black">Page {currentPage} of {totalPages}</span>
              <button
                type="button"
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages || isLoading}
                className="rounded-none border border-black px-3 py-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                &gt;
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages || isLoading}
                className="rounded-none border border-black px-3 py-1 disabled:opacity-50 disabled:cursor-not-allowed"
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
