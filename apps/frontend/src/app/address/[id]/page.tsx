'use client'

import { useState, useEffect } from 'react';
import { getNetwork } from '@/utils/utils';
import { fetchAttestationsByUser, useAttestationCountByUser, useAttestationCountByCreator, useAttestationCountByRecipient } from '@/api';
import { Header } from '@/components/header';
import { SuiAttestationTable } from '@/components/attestations/sui-attestation-table';
import { AptosAttestationTable } from '@/components/attestations/aptos-attestation-table';
import { useChain } from '@/components/providers/chain-provider';
import { LoadingOverlay } from '@/components/ui/loading-overlay';
import { AttestationWithSchema } from '@/api/types';

export default function AddressPage({ params }: { params: { id: string } }) {
  const { currentChain } = useChain();
  const network = getNetwork();
  const { id } = params;

  const [attestations, setAttestations] = useState<AttestationWithSchema[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const { data: attestationsCntData, isLoading: isLoadingAttestationsCnt } = useAttestationCountByUser(id, currentChain, network as any);
  const { data: attestationCntByCreatorData, isLoading: isLoadingAttestationsCntByCreator } = useAttestationCountByCreator(id, currentChain, network as any);
  const { data: attestationCntByRecipientData, isLoading: isLoadingAttestationsCntByRecipient } = useAttestationCountByRecipient(id, currentChain, network as any);

  const attestationsCnt = attestationsCntData?.success ? attestationsCntData.data.count : 0;
  const attestationCntByCreator = attestationCntByCreatorData?.success ? attestationCntByCreatorData.data.count : 0;
  const attestationCntByRecipient = attestationCntByRecipientData?.success ? attestationCntByRecipientData.data.count : 0;

  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20
  const totalPages = Math.max(1, Math.ceil(attestationsCnt / itemsPerPage))

  useEffect(() => {
    const fetchDatas = async () => {
      setIsLoading(true);
      try {
        const offset = (currentPage - 1) * itemsPerPage;
        const response = await fetchAttestationsByUser(id, currentChain, network as any, { offset, limit: itemsPerPage });
        if (response.success) {
          setAttestations(response.data);
        } else {
          console.error('Failed to fetch attestations:', response.message);
          setAttestations([]);
        }
      } catch (error) {
        console.error('Failed to fetch attestations:', error);
        setAttestations([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDatas();
  }, [currentPage, itemsPerPage, currentChain, network, id]);

  const summaryLoading = isLoadingAttestationsCnt || isLoadingAttestationsCntByCreator || isLoadingAttestationsCntByRecipient;
  const formatAddress = (value: string) => `${value.slice(0, 8)}...${value.slice(-6)}`;

  if (summaryLoading) {
    return (
      <div className="min-h-screen bg-[#F4F7FF] text-black">
        <Header />
        <div className="max-w-4xl mx-auto py-20">
          <LoadingOverlay
            size="lg"
            text="Loading Address Data..."
            showBackground={false}
            className="min-h-[calc(100vh-4rem)]"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F7FF] text-black">
      <Header />
      <main className="max-w-6xl mx-auto space-y-6 px-4 py-8">
        <section className="border border-black bg-white px-6 py-5 space-y-2">
          <p className="text-xs font-black uppercase tracking-[0.3em] text-black/60">Address Ledger</p>
          <h1 className="text-3xl font-black tracking-tight">{formatAddress(id)}</h1>
          <p className="text-sm font-bold text-black/70">Aggregated attestations on {currentChain?.toUpperCase() || 'CHAIN'}</p>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {[{
            label: 'Total attestations',
            value: attestationsCnt
          }, {
            label: 'Created',
            value: attestationCntByCreator
          }, {
            label: 'Received',
            value: attestationCntByRecipient
          }].map((metric) => (
            <div key={metric.label} className="border border-black bg-white px-5 py-4">
              <p className="text-xs font-black uppercase tracking-[0.3em] text-black/60">{metric.label}</p>
              <p className="text-3xl font-black text-black">{metric.value?.toLocaleString() ?? '0'}</p>
            </div>
          ))}
        </section>

        <section className="border border-black bg-white">
          <div className="border-b border-black px-6 py-4 space-y-1">
            <p className="text-xs font-black uppercase tracking-[0.3em] text-black/70">Attestation History</p>
            <h2 className="text-2xl font-black text-black">Recent entries</h2>
            <p className="text-xs font-bold text-black/60">Paginated list of attestations involving this address</p>
          </div>
          <div className="px-0 py-6">
            {isLoading ? (
              <LoadingOverlay 
                size="md" 
                text="Loading Attestations..." 
                showBackground={false}
                className="py-12"
              />
            ) : currentChain === "sui" ? (
              <SuiAttestationTable attestations={attestations} />
            ) : (
              <AptosAttestationTable attestations={attestations} />
            )}
          </div>
        </section>

        {totalPages > 1 && (
          <div className="flex justify-center">
            <div className="flex flex-wrap items-center justify-center gap-2 border border-black bg-white px-4 py-3 text-xs font-black uppercase tracking-[0.2em] text-black">
              {['First', '<', '>', 'Last'].map((label, index) => {
                const handlers = [
                  () => setCurrentPage(1),
                  () => setCurrentPage((prev) => Math.max(prev - 1, 1)),
                  () => setCurrentPage((prev) => Math.min(prev + 1, totalPages)),
                  () => setCurrentPage(totalPages),
                ];
                const disabled = [
                  currentPage === 1,
                  currentPage === 1,
                  currentPage === totalPages,
                  currentPage === totalPages,
                ][index];
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={handlers[index]}
                    disabled={disabled}
                    className="rounded-none border border-black px-3 py-1 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {label}
                  </button>
                );
              })}
              <span className="px-3 py-1 text-xs font-black">Page {currentPage} of {totalPages}</span>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
