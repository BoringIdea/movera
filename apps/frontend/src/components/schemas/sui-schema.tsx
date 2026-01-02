import Link from "next/link"
import { useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { Codec } from "@movera/sdk"
import { getExplorerUrl, getExplorerTxUrl } from '@/utils'
import { Chain } from "@/components/providers/chain-provider";

export default function SuiSchema({ chain, schema }: { chain: Chain, schema: any }) {
  const codec = new Codec(schema.schema);
  const item = codec.schemaItem();
  const formattedChain = chain.charAt(0).toUpperCase() + chain.slice(1);
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#F4F7FF] text-black">
      <Header />
      <main className="max-w-5xl mx-auto space-y-6 px-4 py-8">
        <section className="border border-black bg-white px-6 py-5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.3em] text-black/70">Schema Detail</p>
              <h1 className="text-3xl font-black">{schema.name}</h1>
              <p className="text-sm font-bold text-black/60">{formattedChain} schema #{schema.id}</p>
            </div>
            <button
              type="button"
              onClick={() => router.push(`/attestation/create?id=${schema.address}`)}
              className="rounded-none border border-black bg-[#2792FF] px-5 py-2 text-xs font-black uppercase tracking-[0.25em] text-white hover:bg-[#1f75d4]"
            >
              Attest with schema
            </button>
          </div>
        </section>

        <section className="border border-black bg-white px-6 py-5 space-y-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.3em] text-black/70">Schema Reference</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-[0.65rem] font-black uppercase tracking-[0.3em] text-black/60">Address</p>
              <a href={`${getExplorerUrl(chain)}/object/${schema.address}`} className="font-mono text-black break-all hover:text-[#2792FF]">
                {schema.address}
              </a>
            </div>
            <div>
              <p className="text-[0.65rem] font-black uppercase tracking-[0.3em] text-black/60">Creator</p>
              <Link href={`/address/${schema.creator}`} className="font-mono text-black break-all hover:text-[#2792FF]">
                {schema.creator}
              </Link>
            </div>
            <div>
              <p className="text-[0.65rem] font-black uppercase tracking-[0.3em] text-black/60">Transaction</p>
              <a href={`${getExplorerTxUrl(chain)}/${schema.tx_hash}`} className="font-mono text-black break-all hover:text-[#2792FF]">
                {schema.tx_hash}
              </a>
            </div>
            <div>
              <p className="text-[0.65rem] font-black uppercase tracking-[0.3em] text-black/60">Resolver</p>
              <p className="font-bold text-black">{schema.resolver ? 'Yes' : 'None'}</p>
            </div>
          </div>
        </section>

        <section className="border border-black bg-white px-6 py-5 space-y-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.3em] text-black/70">Decoded Schema</p>
          </div>
          <div className="space-y-3">
            {item.map((field: any, index: number) => (
              <div key={index} className="border border-black px-4 py-3">
                <p className="text-[0.65rem] font-black uppercase tracking-[0.3em] text-black/60">{field.type}</p>
                <p className="font-bold text-black">{field.name}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="border border-black bg-white px-6 py-5 space-y-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.3em] text-black/70">Raw Schema</p>
          </div>
          <div className="border border-black bg-white px-4 py-3 font-mono text-xs text-black break-words">
            {schema.schema}
          </div>
        </section>

        <section className="flex flex-col gap-3 border border-black bg-white px-6 py-5">
          <p className="text-xs font-black uppercase tracking-[0.3em] text-black/70">Attestation Count</p>
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-black/60">{schema.attestation_cnt || 0} attestations</p>
            <Link href={`/attestations/${schema.address}`} className="text-xs font-black uppercase tracking-[0.3em] border border-black px-3 py-1 hover:bg-[#D0E8FF]/80">
              View attestations
            </Link>
          </div>
        </section>
      </main>
    </div>
  )
}
