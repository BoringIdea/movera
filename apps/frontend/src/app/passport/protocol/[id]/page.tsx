'use client'

import { Header } from '@/components/header'
import Link from 'next/link'
import { useParams } from 'next/navigation'

export default function GenericProtocolPage() {
  const params = useParams();
  const id = Array.isArray(params?.id) ? params?.id[0] : (params as any)?.id;

  return (
    <div className="mv-shell">
      <Header />
      <main className="mv-frame max-w-7xl py-8">
        <div className="mb-8">
          <p className="mv-kicker">Protocol</p>
          <h1 className="mv-title text-3xl md:text-4xl">{String(id).toUpperCase()} Protocol</h1>
          <p className="mv-copy">Protocol overview, metrics and your interaction history</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link href={`/passport/protocol/${id}/analysis`} className="mv-panel p-6 transition-colors hover:bg-white">
            <div className="mv-heading text-xl">Analysis</div>
            <div className="mv-copy mt-1">Analytics and insights</div>
          </Link>
          <div className="mv-panel p-6">
            <div className="mv-heading text-xl">My Activity</div>
            <div className="mv-copy mt-1">Timeline of your interactions (coming soon)</div>
          </div>
          <div className="mv-panel p-6">
            <div className="mv-heading text-xl">Tasks & Badges</div>
            <div className="mv-copy mt-1">Reputation tasks and progress (coming soon)</div>
          </div>
        </div>
      </main>
    </div>
  )
}

