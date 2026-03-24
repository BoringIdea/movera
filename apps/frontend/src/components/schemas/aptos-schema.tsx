import Link from "next/link"
import { useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { Codec } from "@movera/sdk"
import { bcs } from "@mysten/bcs"
import { Hex } from "@aptos-labs/ts-sdk";
import { getExplorerUrl, getExplorerTxUrl } from '@/utils'
import { Chain } from "@/components/providers/chain-provider";

export default function AptosSchema({ chain, schema }: { chain: Chain, schema: any }) {
  const schemaRawString = bcs.string().parse(Hex.fromHexString(schema.schema).toUint8Array());
  const codec = new Codec(schemaRawString);
  const item = codec.schemaItem();
  const formattedChain = chain.charAt(0).toUpperCase() + chain.slice(1);
  const router = useRouter();

  return (
    <div className="mv-shell">
      <Header />
      <main className="mv-frame max-w-5xl space-y-6 py-8">
        <section className="mv-panel px-6 py-5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <p className="mv-kicker">Schema Detail</p>
              <h1 className="mv-title text-3xl md:text-4xl">{schema.name}</h1>
              <p className="mv-copy mt-1">{formattedChain} schema #{schema.id}</p>
            </div>
            <button
              type="button"
              onClick={() => router.push(`/attestation/create?id=${schema.address}`)}
              className="mv-btn-primary"
            >
              Attest with schema
            </button>
          </div>
        </section>

        <section className="mv-panel space-y-4 px-6 py-5">
          <div>
            <p className="mv-kicker">Schema Reference</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="mv-kicker">Address</p>
              <a href={`${getExplorerUrl(chain)}/object/${schema.address}`} className="font-mono text-black break-all hover:text-[#5f9bff]">
                {schema.address}
              </a>
            </div>
            <div>
              <p className="mv-kicker">Creator</p>
              <Link href={`/address/${schema.creator}`} className="font-mono text-black break-all hover:text-[#5f9bff]">
                {schema.creator}
              </Link>
            </div>
            <div>
              <p className="mv-kicker">Transaction</p>
              <a href={`${getExplorerTxUrl(chain)}/${schema.tx_hash}`} className="font-mono text-black break-all hover:text-[#5f9bff]">
                {schema.tx_hash || 'N/A'}
              </a>
            </div>
            <div>
              <p className="mv-kicker">Resolver</p>
              <p className="text-black">{schema.resolver !== '0x0' ? 'Yes' : 'None'}</p>
            </div>
          </div>
        </section>

        <section className="mv-panel space-y-4 px-6 py-5">
          <div>
            <p className="mv-kicker">Decoded Schema</p>
          </div>
          <div className="space-y-3">
            {item.map((field: any, index: number) => (
              <div key={index} className="border border-black/10 bg-white/72 px-4 py-3">
                <p className="mv-kicker">{field.type}</p>
                <p className="mt-1 text-base text-black">{field.name}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mv-panel space-y-4 px-6 py-5">
          <div>
            <p className="mv-kicker">Raw Schema</p>
          </div>
          <div className="border border-black/10 bg-white/72 px-4 py-3 font-mono text-xs text-black break-words">
            {schemaRawString}
          </div>
        </section>

        <section className="mv-panel flex flex-col gap-3 px-6 py-5">
          <p className="mv-kicker">Attestation Count</p>
          <div className="flex items-center justify-between">
            <p className="text-sm text-black/55">{schema.attestation_cnt || 0} attestations</p>
            <Link href={`/attestations/${schema.address}`} className="mv-btn-secondary px-3 py-1">
              View attestations
            </Link>
          </div>
        </section>
      </main>
    </div>
  )
}
