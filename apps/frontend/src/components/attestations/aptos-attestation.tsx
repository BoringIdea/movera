import { Header } from "@/components/header"
import { Codec } from "@movera/sdk";
import { bcs } from "@mysten/bcs";
import { Hex } from "@aptos-labs/ts-sdk";
import { getExplorerUrl, getExplorerTxUrl } from "@/utils/utils";
import { Chain } from "@/components/providers/chain-provider";
import { fetchOffChainData } from "@/api/attestation";
import { useEffect, useMemo, useState } from "react";
import { Buffer } from "buffer";

const formatValue = (value: any): string => {
  if (typeof value === 'bigint') {
    return value.toString();
  }
  if (typeof value === 'string' && value.endsWith('n')) {
    return BigInt(value.slice(0, -1)).toString();
  }
  if (typeof value === 'object' && value !== null) {
    return JSON.stringify(value, (_, v) =>
      typeof v === 'bigint' ? v.toString() : v
    );
  }
  return String(value);
};

const decodeTimestamp = (value?: string) => {
  if (!value) return '—';
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return '—';
  return new Date(numeric * 1000).toUTCString();
};

export function AptosAttestation({ chain, attestation }: { chain: Chain; attestation: any }) {
  // Convert to number for comparison (backend returns string)
  const storageType = Number(attestation.storage_type ?? 0);
  const isOffChain = storageType === 1 || (!!attestation.shelby_account && !!attestation.shelby_blob_name);
  const [offChainBase64, setOffChainBase64] = useState<string | null>(null);
  const [offChainBytes, setOffChainBytes] = useState<Uint8Array | null>(null);
  const [offChainError, setOffChainError] = useState<string | null>(null);
  const [isLoadingOffChain, setIsLoadingOffChain] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const loadOffChain = async () => {
      if (!isOffChain || !attestation.shelby_account || !attestation.shelby_blob_name) return;
      try {
        setIsLoadingOffChain(true);
        setOffChainError(null);
        const response = await fetchOffChainData('aptos', attestation.shelby_account, attestation.shelby_blob_name);
        if (cancelled) return;
        const base64 = response.data.data_base64;
        const bytes = base64?.startsWith('0x')
          ? Hex.fromHexString(base64).toUint8Array()
          : new Uint8Array(Buffer.from(base64, 'base64'));
        setOffChainBase64(base64);
        setOffChainBytes(bytes);
      } catch (error) {
        if (!cancelled) {
          setOffChainError(error instanceof Error ? error.message : 'Failed to load off-chain data');
        }
      } finally {
        if (!cancelled) {
          setIsLoadingOffChain(false);
        }
      }
    };

    loadOffChain();
    return () => {
      cancelled = true;
    };
  }, [isOffChain, attestation.shelby_account, attestation.shelby_blob_name]);

  const { item, decoded, rawDataDisplay } = useMemo(() => {
    if (!attestation.schema_data) {
      return { item: [], decoded: null, rawDataDisplay: '—' };
    }

    let schema: string | null = null;
    if (typeof attestation.schema_data === 'string' && attestation.schema_data.startsWith('0x')) {
      try {
        const rawSchema = Hex.fromHexString(attestation.schema_data).toUint8Array();
        schema = bcs.string().parse(rawSchema);
      } catch {
        schema = null;
      }
    } else if (typeof attestation.schema_data === 'string') {
      schema = attestation.schema_data;
    }

    if (!schema) {
      return { item: [], decoded: null, rawDataDisplay: '—' };
    }

    const codec = new Codec(schema);
    const item = codec.schemaItem();
    let decoded: any = null;
    let rawDataDisplay = attestation.data ?? '—';

    if (isOffChain) {
      rawDataDisplay = offChainBase64 ?? '—';
      if (offChainBytes) {
        try {
          decoded = codec.decodeFromBytes(offChainBytes);
        } catch {
          decoded = null;
        }
      }
    } else if (attestation.data) {
      try {
        decoded = codec.decodeFromBytes(Hex.fromHexString(attestation.data).toUint8Array());
      } catch {
        decoded = null;
      }
    }

    return { item, decoded, rawDataDisplay };
  }, [attestation.schema_data, attestation.data, isOffChain, offChainBase64, offChainBytes]);

  return (
    <div className="min-h-screen bg-[#F4F7FF] text-black">
      <Header />
      <main className="max-w-5xl mx-auto space-y-6 px-4 py-8">
        <section className="border border-black bg-white px-6 py-5">
          <p className="text-xs font-black uppercase tracking-[0.3em] text-black/70">Attestation Detail</p>
          <h1 className="text-3xl font-black">{isOffChain ? 'Offchain Attestation' : 'Onchain Attestation'}</h1>
          <p className="text-sm font-bold text-black/60">Ledger reference: {attestation.address}</p>
        </section>

        <section className="border border-black bg-white px-6 py-5 space-y-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.3em] text-black/70">Basic Information</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-[0.65rem] font-black uppercase tracking-[0.3em] text-black/60">UID</p>
              <a href={`${getExplorerUrl(chain)}/object/${attestation.address}`} className="font-mono text-black hover:text-[#2792FF] break-all">
                {attestation.address}
              </a>
            </div>
            <div>
              <p className="text-[0.65rem] font-black uppercase tracking-[0.3em] text-black/60">Schema</p>
              <p className="font-bold text-black">{attestation.schema_name || `Schema #${attestation.schema_id ?? '—'}`}</p>
              <p className="font-mono text-black/80 break-all">{attestation.schema_address}</p>
            </div>
            <div>
              <p className="text-[0.65rem] font-black uppercase tracking-[0.3em] text-black/60">Created</p>
              <p className="font-bold text-black">{decodeTimestamp(attestation.time)}</p>
            </div>
            <div>
              <p className="text-[0.65rem] font-black uppercase tracking-[0.3em] text-black/60">Revocable</p>
              <p className="font-bold text-black">{attestation.revocable ? 'Yes' : 'No'}</p>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-[0.65rem] font-black uppercase tracking-[0.3em] text-black/60">Expiration</p>
              <p className="font-bold text-black">{attestation.expiration_time ? decodeTimestamp(attestation.expiration_time) : 'Never'}</p>
            </div>
            <div>
              <p className="text-[0.65rem] font-black uppercase tracking-[0.3em] text-black/60">Revoked</p>
              <p className="font-bold text-black">{attestation.revocation_time && attestation.revocation_time !== '0' ? decodeTimestamp(attestation.revocation_time) : 'No'}</p>
            </div>
          </div>
        </section>

        <section className="border border-black bg-white px-6 py-5 space-y-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.3em] text-black/70">Participants</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-[0.65rem] font-black uppercase tracking-[0.3em] text-black/60">Attestor</p>
              <p className="font-mono text-black break-all">{attestation.attestor}</p>
            </div>
            <div>
              <p className="text-[0.65rem] font-black uppercase tracking-[0.3em] text-black/60">Recipient</p>
              <p className="font-mono text-black break-all">{attestation.recipient}</p>
            </div>
          </div>
        </section>

        <section className="border border-black bg-white px-6 py-5 space-y-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.3em] text-black/70">Decoded Data</p>
          </div>
          <div className="space-y-3">
            {isOffChain && isLoadingOffChain && (
              <p className="font-mono text-xs text-black/70">Loading off-chain data...</p>
            )}
            {offChainError && (
              <p className="font-mono text-xs text-red-600">{offChainError}</p>
            )}
            {decoded && item.map((field: any, index: number) => (
              <div key={index} className="border border-black px-4 py-3">
                <p className="text-[0.65rem] font-black uppercase tracking-[0.3em] text-black/60">{field.type}</p>
                <p className="font-bold text-black">{field.name}</p>
                <p className="font-mono text-xs font-black text-black/70 break-all">{formatValue(decoded[field.name])}</p>
              </div>
            ))}
            {!decoded && !isLoadingOffChain && (
              <p className="font-mono text-xs text-black/70">No decoded data available.</p>
            )}
          </div>
        </section>

        <section className="border border-black bg-white px-6 py-5 space-y-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.3em] text-black/70">Transaction Information</p>
          </div>
          <div className="grid gap-4">
            <div>
              <p className="text-[0.65rem] font-black uppercase tracking-[0.3em] text-black/60">Transaction ID</p>
              <a href={`${getExplorerTxUrl(chain)}/${attestation.tx_hash || ''}`} className="font-mono text-black hover:text-[#2792FF] break-all">
                {attestation.tx_hash || 'N/A'}
              </a>
            </div>
            <div>
              <p className="text-[0.65rem] font-black uppercase tracking-[0.3em] text-black/60">Reference</p>
              <p className="font-bold text-black">{attestation.ref_attestation && attestation.ref_attestation !== '0x0' ? attestation.ref_attestation : 'No reference'}</p>
            </div>
          </div>
        </section>

        <section className="border border-black bg-white px-6 py-5">
          <p className="text-xs font-black uppercase tracking-[0.3em] text-black/70">Raw Data</p>
          <div className="mt-3 border border-black bg-white px-4 py-3 font-mono text-xs text-black break-words">
            {rawDataDisplay}
          </div>
        </section>
      </main>
    </div>
  )
}
