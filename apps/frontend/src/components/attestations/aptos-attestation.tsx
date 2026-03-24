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
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <Header />
      <main className="mv-shell space-y-6 py-8">
        <section className="mv-panel-muted px-6 py-5">
          <p className="mv-kicker">Attestation Detail</p>
          <h1 className="mv-title mt-3 text-3xl md:text-4xl">{isOffChain ? 'Offchain Attestation' : 'Onchain Attestation'}</h1>
          <p className="mv-copy mt-3">Ledger reference: {attestation.address}</p>
        </section>

        <section className="mv-panel space-y-4 px-6 py-5">
          <div><p className="mv-kicker">Basic Information</p></div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-black/45">UID</p>
              <a href={`${getExplorerUrl(chain)}/object/${attestation.address}`} className="mt-2 block font-mono text-xs text-black transition-colors hover:text-[#5f9bff] break-all">
                {attestation.address}
              </a>
            </div>
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-black/45">Schema</p>
              <p className="mt-2 font-[family-name:var(--font-display)] text-2xl leading-none text-black">{attestation.schema_name || `Schema #${attestation.schema_id ?? '—'}`}</p>
              <p className="mt-2 font-mono text-xs text-black/55 break-all">{attestation.schema_address}</p>
            </div>
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-black/45">Created</p>
              <p className="mt-2 text-sm text-black/72">{decodeTimestamp(attestation.time)}</p>
            </div>
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-black/45">Revocable</p>
              <p className="mt-2 text-sm text-black/72">{attestation.revocable ? 'Yes' : 'No'}</p>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-black/45">Expiration</p>
              <p className="mt-2 text-sm text-black/72">{attestation.expiration_time ? decodeTimestamp(attestation.expiration_time) : 'Never'}</p>
            </div>
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-black/45">Revoked</p>
              <p className="mt-2 text-sm text-black/72">{attestation.revocation_time && attestation.revocation_time !== '0' ? decodeTimestamp(attestation.revocation_time) : 'No'}</p>
            </div>
          </div>
        </section>

        <section className="mv-panel space-y-4 px-6 py-5">
          <div><p className="mv-kicker">Participants</p></div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-black/45">Attestor</p>
              <p className="mt-2 font-mono text-xs text-black break-all">{attestation.attestor}</p>
            </div>
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-black/45">Recipient</p>
              <p className="mt-2 font-mono text-xs text-black break-all">{attestation.recipient}</p>
            </div>
          </div>
        </section>

        <section className="mv-panel space-y-4 px-6 py-5">
          <div><p className="mv-kicker">Decoded Data</p></div>
          <div className="space-y-3">
            {isOffChain && isLoadingOffChain && (
              <p className="font-mono text-xs uppercase tracking-[0.16em] text-black/45">Loading off-chain data...</p>
            )}
            {offChainError && (
              <p className="font-mono text-xs uppercase tracking-[0.16em] text-[#b42318]">{offChainError}</p>
            )}
            {decoded && item.map((field: any, index: number) => (
              <div key={index} className="mv-panel-muted space-y-2 px-4 py-3">
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-black/45">{field.type}</p>
                <p className="mv-heading text-[1.55rem]">{field.name}</p>
                <p className="font-mono text-xs text-black/72 break-all">{formatValue(decoded[field.name])}</p>
              </div>
            ))}
            {!decoded && !isLoadingOffChain && (
              <p className="font-mono text-xs uppercase tracking-[0.16em] text-black/45">No decoded data available.</p>
            )}
          </div>
        </section>

        <section className="mv-panel space-y-4 px-6 py-5">
          <div><p className="mv-kicker">Transaction Information</p></div>
          <div className="grid gap-4">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-black/45">Transaction ID</p>
              <a href={`${getExplorerTxUrl(chain)}/${attestation.tx_hash || ''}`} className="mt-2 block font-mono text-xs text-black transition-colors hover:text-[#5f9bff] break-all">
                {attestation.tx_hash || 'N/A'}
              </a>
            </div>
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-black/45">Reference</p>
              <p className="mt-2 text-sm text-black/72">{attestation.ref_attestation && attestation.ref_attestation !== '0x0' ? attestation.ref_attestation : 'No reference'}</p>
            </div>
          </div>
        </section>

        <section className="mv-panel px-6 py-5">
          <p className="mv-kicker">Raw Data</p>
          <div className="mt-3 border border-black/10 bg-[#fbfbf8] px-4 py-3 font-mono text-xs text-black break-words">
            {rawDataDisplay}
          </div>
        </section>
      </main>
    </div>
  )
}
