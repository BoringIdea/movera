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

function compactHash(value?: string | null, head = 3, tail = 4) {
  if (!value) return '—';
  if (value.length <= head + tail + 1) return value;
  return `${value.slice(0, head)}...${value.slice(-tail)}`;
}

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
    <div className="mv-shell">
      <Header />
      <main className="mv-frame space-y-6 py-8">
        <section className="mv-panel flex flex-col gap-4 px-6 py-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="mv-kicker">Schema Ledger</p>
            <h1 className="mv-title text-3xl md:text-4xl">{formattedChain} Schemas</h1>
            <p className="mv-copy">Overview of on-chain schema definitions.</p>
          </div>
          <button
            type="button"
            onClick={() => router.push('/schema/create')}
            className="mv-btn-primary"
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
            <div key={card.title} className="mv-panel px-5 py-4" style={{ backgroundImage: card.gradient }}>
              <div className="mv-tag mb-3 bg-white/80">
                <p>{card.title}</p>
              </div>
              <p className="mv-heading text-3xl">{card.value?.toLocaleString() ?? '0'}</p>
              <p className="text-xs text-black/60">{card.detail}</p>
            </div>
          ))}
        </section>

        <section className="mv-panel">
          <div className="border-b border-black/10 px-6 py-4">
            <p className="mv-kicker">Schema List</p>
            <h2 className="mv-heading">Current registry</h2>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-black/10 bg-white/70">
                  <TableHead className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-[0.16em] text-black/45">ID</TableHead>
                  <TableHead className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-[0.16em] text-black/45">Name</TableHead>
                  <TableHead className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-[0.16em] text-black/45">Creator</TableHead>
                  <TableHead className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-[0.16em] text-black/45">Schema</TableHead>
                  <TableHead className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-[0.16em] text-black/45">Resolver</TableHead>
                  <TableHead className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-[0.16em] text-black/45">Attestations</TableHead>
                  <TableHead className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-[0.16em] text-black/45">Tx Hash</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow className="border-b border-black/10">
                    <TableCell className="px-4 py-4 font-mono text-xs uppercase tracking-[0.16em] text-black/45" colSpan={7}>Loading schemas...</TableCell>
                  </TableRow>
                ) : schemas.length === 0 ? (
                  <TableRow className="border-b border-black/10">
                    <TableCell className="px-4 py-4 font-mono text-xs uppercase tracking-[0.16em] text-black/45" colSpan={7}>No schemas available.</TableCell>
                  </TableRow>
                ) : (
                  schemas.map((schema) => (
                    <TableRow key={schema.address} className="border-b border-black/10 transition-colors duration-150 hover:bg-[#eef5ff]/60">
                      <TableCell className="px-4 py-3 font-mono text-xs text-black">#{schema.id}</TableCell>
                      <TableCell className="px-4 py-3">
                        <Link href={`/schema/${schema.address}`} className="font-[family-name:var(--font-display)] text-[16px] leading-none tracking-[-0.01em] text-black transition-colors hover:text-[#5f9bff] md:text-[18px]">
                          {schema.name}
                        </Link>
                      </TableCell>
                      <TableCell className="px-4 py-3 font-mono text-xs text-black/70">{compactHash(schema.creator)}</TableCell>
                      <TableCell className="px-4 py-3">
                        {schemaSummaries[schema.address]?.length ? (
                          <div className="flex flex-wrap gap-2">
                            {schemaSummaries[schema.address].map((field, idx) => (
                              <span
                                key={`${schema.address}-${field.name}-${idx}`}
                                className="mv-tag border-[#f1dfbd] bg-[#fff6e8] px-2 py-1 text-[#9a6700]"
                              >
                                {(field.name ?? 'field').length > 12 ? `${field.name.slice(0, 11)}…` : field.name}
                                <span className="block font-mono text-[9px] uppercase tracking-[0.14em] text-black/45">
                                  {field.type}
                                </span>
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="font-mono text-xs uppercase tracking-[0.16em] text-black/45">—</p>
                        )}
                      </TableCell>
                      <TableCell className="px-4 py-3 font-mono text-[10px] uppercase tracking-[0.16em] text-black">
                        {schema.resolver && schema.resolver !== '0x0' ? 'Has resolver' : 'No resolver'}
                      </TableCell>
                      <TableCell className="px-4 py-3 font-mono text-[10px] uppercase tracking-[0.16em] text-black">
                        {schema.attestation_cnt?.toLocaleString() ?? '0'}
                      </TableCell>
                      <TableCell className="px-4 py-3 font-mono text-xs text-black/70">{compactHash(schema.tx_hash)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
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
