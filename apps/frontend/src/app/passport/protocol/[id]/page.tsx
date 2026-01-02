'use client'

import { Header } from '@/components/header'
import Link from 'next/link'
import { useParams } from 'next/navigation'

export default function GenericProtocolPage() {
  const params = useParams();
  const id = Array.isArray(params?.id) ? params?.id[0] : (params as any)?.id;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50/30 via-white to-blue-50/30">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{String(id).toUpperCase()} Protocol</h1>
          <p className="text-gray-600">Protocol overview, metrics and your interaction history</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link href={`/passport/protocol/${id}/analysis`} className="rounded-2xl border border-blue-200/60 bg-white/80 backdrop-blur p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="text-lg font-semibold text-gray-900">Analysis</div>
            <div className="text-gray-600 mt-1">Analytics and insights</div>
          </Link>
          <div className="rounded-2xl border border-blue-200/60 bg-white/80 backdrop-blur p-6 shadow-sm">
            <div className="text-lg font-semibold text-gray-900">My Activity</div>
            <div className="text-gray-600 mt-1">Timeline of your interactions (coming soon)</div>
          </div>
          <div className="rounded-2xl border border-blue-200/60 bg-white/80 backdrop-blur p-6 shadow-sm">
            <div className="text-lg font-semibold text-gray-900">Tasks & Badges</div>
            <div className="text-gray-600 mt-1">Reputation tasks and progress (coming soon)</div>
          </div>
        </div>
      </main>
    </div>
  )
}


