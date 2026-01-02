'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from "next/link"
import { Header } from '@/components/header'
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table"
import { fetchSchemas } from "@/api/schema";
import { Schema } from "@/api/types";
import { Codec } from "@movera/sdk"
import { bcs } from "@mysten/bcs"
import { Hex } from "@aptos-labs/ts-sdk";

export function Schemas({
  chain,
  network,
  schemaCnt,
  creatorCnt
}: {
  chain: string,
  network: string,
  schemaCnt: number,
  creatorCnt: number
}) {
  const router = useRouter()

  const [schemas, setSchemas] = useState<Schema[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20
  const totalPages = Math.max(1, Math.ceil(schemaCnt / itemsPerPage))

  useEffect(() => {
    const fetchDatas = async () => {
      setIsLoading(true);
      try {
        const offset = (currentPage - 1) * itemsPerPage;
        const response = await fetchSchemas(chain as any, network as any, { offset, limit: itemsPerPage });
        if (response.success) {
          setSchemas(response.data);
        } else {
          console.error('Failed to fetch schemas:', response.message);
          setSchemas([]);
        }
      } catch (error) {
        console.error('Error fetching schemas:', error);
        setSchemas([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDatas();
  }, [chain, network, currentPage, itemsPerPage]);

  const formattedChain = chain.charAt(0).toUpperCase() + chain.slice(1);

  const schemaSummaries = useMemo(() => {
    const map: Record<string, { type: string; name: string }[]> = {};
    const parseRaw = (schemaValue: string) => {
      try {
        const codec = schemaValue.startsWith('0x')
          ? new Codec(bcs.string().parse(Hex.fromHexString(schemaValue).toUint8Array()))
          : new Codec(schemaValue);
        return codec.schemaItem().map((field: any) => ({
          type: (field.type || 'unknown').toString(),
          name: field.name || 'field',
        }));
      } catch {
        return [];
      }
    };

    schemas.forEach((schema) => {
      map[schema.address] = parseRaw(schema.schema);
    });

    return map;
  }, [schemas]);

  return (
    <div className="min-h-screen bg-[#F4F7FF] text-black">
      <Header />
      <main className="max-w-6xl mx-auto space-y-6 px-4 py-8">
        <section className="border border-black bg-white px-6 py-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.3em] text-black/70">Schema Ledger</p>
            <h1 className="text-3xl font-black">{formattedChain} Schemas</h1>
            <p className="text-sm font-bold text-black/60">Overview of on-chain schema definitions.</p>
          </div>
          <button
            type="button"
            onClick={() => router.push('/schema/create')}
            className="rounded-none border border-black bg-[#2792FF] px-5 py-2 text-xs font-black uppercase tracking-[0.2em] text-white"
          >
            CREATE SCHEMA
          </button>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          {[{
            title: 'Total Schemas',
            value: schemaCnt,
            detail: 'Defined schemas',
            gradient: 'linear-gradient(180deg, #effffe 0%, #d8ffe2 100%)'
          }, {
            title: 'Creators',
            value: creatorCnt,
            detail: 'Unique creators',
            gradient: 'linear-gradient(180deg, #f7f8ff 0%, #dbe7ff 100%)'
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
            <p className="text-xs font-black uppercase tracking-[0.3em] text-black/70">Schema List</p>
            <h2 className="text-2xl font-black text-black">Current registry</h2>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-black bg-white">
                  <TableHead className="px-4 py-3 text-left text-xs font-black uppercase tracking-[0.3em] text-black">ID</TableHead>
                  <TableHead className="px-4 py-3 text-left text-xs font-black uppercase tracking-[0.3em] text-black">Name</TableHead>
                  <TableHead className="px-4 py-3 text-left text-xs font-black uppercase tracking-[0.3em] text-black">Creator</TableHead>
                  <TableHead className="px-4 py-3 text-left text-xs font-black uppercase tracking-[0.3em] text-black">Schema</TableHead>
                  <TableHead className="px-4 py-3 text-left text-xs font-black uppercase tracking-[0.3em] text-black">Resolver</TableHead>
                  <TableHead className="px-4 py-3 text-left text-xs font-black uppercase tracking-[0.3em] text-black">Attestations</TableHead>
                  <TableHead className="px-4 py-3 text-left text-xs font-black uppercase tracking-[0.3em] text-black">Tx Hash</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow className="border-b border-black">
                    <TableCell className="px-4 py-4 text-sm font-black text-black/60" colSpan={7}>Loading schemas...</TableCell>
                  </TableRow>
                ) : schemas.length === 0 ? (
                  <TableRow className="border-b border-black">
                    <TableCell className="px-4 py-4 text-sm font-black text-black/60" colSpan={7}>No schemas available.</TableCell>
                  </TableRow>
                ) : (
                  schemas.map((schema) => (
                    <TableRow key={schema.address} className="border-b border-black hover:bg-[#D0E8FF]/40 transition-colors duration-150">
                      <TableCell className="px-4 py-3 font-mono text-xs text-black">#{schema.id}</TableCell>
                      <TableCell className="px-4 py-3 font-black">
                        <Link href={`/schema/${schema.address}`} className="text-black hover:text-[#2792FF]">
                          {schema.name}
                        </Link>
                      </TableCell>
                      <TableCell className="px-4 py-3 font-mono text-xs text-black/70 break-all">{schema.creator}</TableCell>
                      <TableCell className="px-4 py-3">
                        {schemaSummaries[schema.address]?.length ? (
                          <div className="flex flex-wrap gap-2">
                            {schemaSummaries[schema.address].map((field, idx) => (
                              <span
                                key={`${schema.address}-${field.name}-${idx}`}
                                className="rounded-none border border-black bg-[#FFF3D1] px-2 py-1 text-[0.65rem] font-black uppercase tracking-[0.2em] text-black"
                              >
                                {(field.name ?? 'field').length > 12 ? `${field.name.slice(0, 11)}…` : field.name}
                                <span className="block text-[0.55rem] font-normal uppercase tracking-[0.15em] text-black/50">
                                  {field.type}
                                </span>
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs font-black uppercase tracking-[0.3em] text-black/60">—</p>
                        )}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-xs font-black uppercase tracking-[0.2em] text-black">
                        {schema.resolver && schema.resolver !== '0x0' ? 'Has resolver' : 'No resolver'}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-xs font-black uppercase tracking-[0.2em] text-black">
                        {schema.attestation_cnt?.toLocaleString() ?? '0'}
                      </TableCell>
                      <TableCell className="px-4 py-3 font-mono text-xs text-black/70 break-all">{schema.tx_hash}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </section>

        {totalPages > 1 && (
          <div className="flex justify-center">
            <div className="flex flex-wrap items-center justify-center gap-2 border border-black bg-white px-4 py-3 text-xs font-black uppercase tracking-[0.2em] text-black">
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
