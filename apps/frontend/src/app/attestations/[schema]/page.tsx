'use client'

import { useState, useEffect } from 'react'
import { useAttestationCountBySchema, fetchAttestationsBySchema } from "@/api/attestation";
import { getNetwork } from "@/utils/utils";
import { SuiAttestationTable } from "@/components/attestations/sui-attestation-table";
import { AptosAttestationTable } from "@/components/attestations/aptos-attestation-table";
import { Header } from "@/components/header";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useChain, Chain } from "@/components/providers/chain-provider"
import { AttestationWithSchema } from "@/api/types";

export default function AttestationsWithSchema({ params }: { params: { schema: string } }) {
  const { currentChain, setCurrentChain } = useChain();
  const network = getNetwork();
  const { schema } = params;

  const [attestations, setAttestations] = useState<AttestationWithSchema[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const { data: attestationCountData, error: attestationCntError } = useAttestationCountBySchema(schema, currentChain, network as any);

  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20
  const attestationCount = attestationCountData?.success ? attestationCountData.data.count : 0;
  const totalPages = Math.ceil(attestationCount / itemsPerPage)

  useEffect(() => {
    const fetchDatas = async () => {
      setIsLoading(true);
      try {
        const offset = (currentPage - 1) * itemsPerPage;
        const response = await fetchAttestationsBySchema(schema, currentChain, network as any, { offset, limit: itemsPerPage });
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
    }
    fetchDatas();
  }, [schema, currentChain, network, currentPage]);

  return (
    <div className="mv-shell flex w-full flex-col">
      <Header />
      <div className="mv-frame py-6">
        <Link href={`/schema/${schema}`} className="transition-colors hover:text-[#5f9bff]">
          <h1 className="mv-heading text-2xl">
            Attestations for Schema <span className="custom-blue-link">{schema}</span>
          </h1>
        </Link>
      </div>
      <div className="mv-frame pb-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-black/45">Loading attestations...</div>
          </div>
        ) : (
          <>
            {currentChain === 'aptos' ?
              <AptosAttestationTable attestations={attestations} /> :
              <SuiAttestationTable attestations={attestations} />
            }
          </>
        )}
      </div>
      {totalPages > 1 && (
        <div className="pb-8">
          <div className="mv-panel mx-auto mt-4 flex w-fit items-center justify-center space-x-2 px-4 py-3">
            <Button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1 || isLoading}
              className="px-2 py-1 text-sm"
            >
              First
            </Button>
            <Button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1 || isLoading}
              className="px-2 py-1 text-sm"
            >
              &lt;
            </Button>
            <span className="text-sm">
              Page {currentPage} of {totalPages} ({attestationCount} total)
            </span>
            <Button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages || isLoading}
              className="px-2 py-1 text-sm"
            >
              &gt;
            </Button>
            <Button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages || isLoading}
              className="px-2 py-1 text-sm"
            >
              Last
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
