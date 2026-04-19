'use client'

import { useEffect, useState } from 'react'

// Uses counterapi.dev — free public counter service, no auth required.
// Each app uses a unique namespace+key so counts don't collide across the suite.
export function Counter({
  namespace,
  counterKey,
  label,
  incrementOnMount = true,
}: {
  namespace: string
  counterKey: string
  label: string
  incrementOnMount?: boolean
}) {
  const [count, setCount] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    const endpoint = incrementOnMount
      ? `https://api.counterapi.dev/v1/${namespace}/${counterKey}/up`
      : `https://api.counterapi.dev/v1/${namespace}/${counterKey}`
    fetch(endpoint)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data?.count != null) setCount(data.count)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [namespace, counterKey, incrementOnMount])

  if (count == null) {
    return (
      <div className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.06] bg-white/[0.02] px-3 py-1 text-[11px] font-mono uppercase tracking-wider text-white/25">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white/30" />
        {label}
      </div>
    )
  }

  return (
    <div className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.06] bg-white/[0.02] px-3 py-1 text-[11px] font-mono uppercase tracking-wider text-white/40">
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-400" />
      <span className="font-bold tabular-nums text-white/90">{count.toLocaleString()}</span>
      <span>{label}</span>
    </div>
  )
}
