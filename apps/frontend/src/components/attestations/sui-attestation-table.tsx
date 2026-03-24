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

export function SuiAttestationTable({ attestations }: { attestations: any[] }) {
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
        className="mv-accent-tag px-2 py-0.5"
      >
        #{attestation.schema_id}
      </Link>
      {attestation.schema_name && (
        <span className="mv-tag bg-white px-2 py-0.5 text-black">
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
            <TableRow className="border-b border-black/10 bg-white/70">
              <TableHead className="w-[90px] px-4 py-4 font-mono text-[10px] uppercase tracking-[0.16em] text-black/45">
                UID
              </TableHead>
              {!isMobile && (
                <TableHead className="px-6 py-4 font-mono text-[10px] uppercase tracking-[0.16em] text-black/45">
                  Schema
                </TableHead>
              )}
              <TableHead className="px-4 py-4 font-mono text-[10px] uppercase tracking-[0.16em] text-black/45">
                From
              </TableHead>
              <TableHead className="px-4 py-4 font-mono text-[10px] uppercase tracking-[0.16em] text-black/45">
                To
              </TableHead>
              {!isMobile && (
                <TableHead className="px-6 py-4 font-mono text-[10px] uppercase tracking-[0.16em] text-black/45">
                  Type
                </TableHead>
              )}
              <TableHead className="min-w-[120px] px-4 py-4 font-mono text-[10px] uppercase tracking-[0.16em] text-black/45">
                Age
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {attestations.map((attestation: any, index: number) => (
              <TableRow
                key={`${attestation.address}-${index}`}
                className="border-b border-black/10 transition-colors duration-150 hover:bg-[#eef5ff]/60"
              >
                <TableCell className="px-4 py-4">
                  <Link
                    href={`/attestation/${attestation.address}`}
                    className="font-mono text-xs text-black transition-colors duration-150 hover:text-[#5f9bff]"
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
                    className="font-mono text-xs text-black transition-colors duration-150 hover:text-[#5f9bff]"
                  >
                    {shortenAddress(attestation.attestor)}
                  </Link>
                </TableCell>
                <TableCell className="px-4 py-4">
                  <Link
                    href={`/address/${attestation.recipient}`}
                    className="font-mono text-xs text-black transition-colors duration-150 hover:text-[#5f9bff]"
                  >
                    {shortenAddress(attestation.recipient)}
                  </Link>
                </TableCell>
                {!isMobile && (
                  <TableCell className="px-6 py-4">
                    {(() => {
                      // Convert to number for comparison (backend may return string)
                      const storageType = Number(attestation.storage_type ?? 0);
                      const isEncrypted = attestation.encrypted === true;
                      
                      if (storageType === 0) {
                        return (
                          <span className="mv-tag whitespace-nowrap bg-white px-2 py-0.5 text-black">
                            ON CHAIN
                          </span>
                        );
                      } else {
                        return (
                          <div className="flex gap-2 items-center flex-wrap">
                            <span className="mv-accent-tag whitespace-nowrap px-2 py-0.5">
                              OFF CHAIN
                            </span>
                            {isEncrypted && (
                              <span className="mv-tag whitespace-nowrap border-[#f1d7b0] bg-[#fff3df] px-2 py-0.5 text-[#b96a1b]">
                                ENCRYPTED
                              </span>
                            )}
                          </div>
                        );
                      }
                    })()}
                  </TableCell>
                )}
                <TableCell className="px-4 py-4 min-w-[120px]">
                  <span className="font-mono text-xs whitespace-nowrap text-black/55">
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
