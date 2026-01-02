'use client'

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { useMediaQuery } from 'react-responsive';

const parseTimestamp = (value?: string) => {
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return new Date();
  }
  return numeric > 1e12 ? new Date(numeric) : new Date(numeric * 1000);
};

export function AptosAttestationTable({ attestations }: { attestations: any[] }) {
  const isMobile = useMediaQuery({ maxWidth: 768 });

  const shortenAddress = (address?: string) => {
    if (!address) return '—';
    if (isMobile) {
      return `${address.slice(0, 4)}...`;
    }
    return `${address.slice(0, 6)}...${address.slice(-6)}`;
  };

  const renderSchemaName = (attestation: any) => (
    <div className="flex flex-wrap gap-2">
      <Link
        href={`/schema/${attestation.schema_address}`}
        className="rounded-none border border-black bg-[#D0E8FF] px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-[0.2em] text-[#2792FF]"
      >
        #{attestation.schema_id}
      </Link>
      {attestation.schema_name && (
        <span className="rounded-none border border-black bg-white px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-[0.2em] text-black">
          {attestation.schema_name}
        </span>
      )}
    </div>
  );

  return (
    <div className="overflow-x-auto">
      <div className="min-w-full">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-black bg-white">
              <TableHead className="w-[90px] px-4 py-4 text-left text-xs font-black uppercase tracking-[0.3em] text-black">
                UID
              </TableHead>
              {!isMobile && (
                <TableHead className="px-6 py-4 text-left text-xs font-black uppercase tracking-[0.3em] text-black">
                  Schema
                </TableHead>
              )}
              <TableHead className="px-4 py-4 text-left text-xs font-black uppercase tracking-[0.3em] text-black">
                From
              </TableHead>
              <TableHead className="px-4 py-4 text-left text-xs font-black uppercase tracking-[0.3em] text-black">
                To
              </TableHead>
              {!isMobile && (
                <TableHead className="px-6 py-4 text-left text-xs font-black uppercase tracking-[0.3em] text-black">
                  Type
                </TableHead>
              )}
              <TableHead className="px-4 py-4 min-w-[120px] text-left text-xs font-black uppercase tracking-[0.3em] text-black">
                Age
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {attestations.map((attestation: any, index: number) => (
              <TableRow
                key={`${attestation.address}-${index}`}
                className="border-b border-black hover:bg-[#D0E8FF]/30 transition-colors duration-150"
              >
                <TableCell className="px-4 py-4">
                  <Link
                    href={`/attestation/${attestation.address}`}
                    className="font-bold text-black hover:text-[#2792FF] transition-colors duration-150"
                  >
                    {shortenAddress(attestation.address)}
                  </Link>
                </TableCell>
                {!isMobile && (
                  <TableCell className="px-6 py-4">
                    {renderSchemaName(attestation)}
                  </TableCell>
                )}
                <TableCell className="px-4 py-4">
                  <Link
                    href={`/address/${attestation.attestor}`}
                    className="font-semibold text-black hover:text-[#2792FF] transition-colors duration-150"
                  >
                    {shortenAddress(attestation.attestor)}
                  </Link>
                </TableCell>
                <TableCell className="px-4 py-4">
                  <Link
                    href={`/address/${attestation.recipient}`}
                    className="font-semibold text-black hover:text-[#2792FF] transition-colors duration-150"
                  >
                    {shortenAddress(attestation.recipient)}
                  </Link>
                </TableCell>
                {!isMobile && (
                  <TableCell className="px-6 py-4">
                    <span className="rounded-none border border-black bg-white px-2 py-0.5 text-[0.65rem] font-black uppercase tracking-[0.2em] text-black">
                      {attestation.tx_hash ? 'OnChain' : 'OffChain'}
                    </span>
                  </TableCell>
                )}
                <TableCell className="px-4 py-4 min-w-[120px]">
                  <span className="font-mono text-xs font-bold text-black/70 whitespace-nowrap">
                    {formatDistanceToNow(parseTimestamp(attestation.time), { addSuffix: true })}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
