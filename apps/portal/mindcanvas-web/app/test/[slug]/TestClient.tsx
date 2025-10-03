// app/test/[slug]/TestClient.tsx
'use client'

import React from 'react'

type Props = {
  slug: string
  initialSid?: string
  prefill?: { name?: string; email?: string; phone?: string }
}

type StartOk = { submissionId: string; testSlug: string }
type StartErr = { error: string }

function isStartOk(x: unknown): x is StartOk {
  return (
    typeof x === 'object' &&
    x !== null &&
    'submissionId' in x &&
    typeof (x as any).submissionId === 'string'
  )
}

export default function TestClient({ slug, initialSid, prefill }: Props) {
  const [sid, setSid] = React.useState<string | undefined>(initialSid)
  const [first, setFirst] = React.useState<string>(() => (prefill?.name ?? '').split(' ')[0] ?? '')
  const [last, setLast] = React.useState<string>(() => (prefill?.name ?? '').split(' ').slice(1).join(' ') ?? '')
  const [email, setEmail] = React.useState<string>(prefill?.email ?? '')
  const [phone, setPhone] = React.useState<string>(prefill?.phone ?? '')
  const [busy, setBusy] = React.useState(false)
  const [err, setErr] = React.useState<string | null>(null)

  // Ensure we have a submission id
  React.useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (sid) return
      setBusy(true)
      setErr(null)
      try {
        const cacheKey = `mc_sid_${slug}`
        const cached = typeof window !== 'undefined' ? localStorage.getItem(cacheKey) : null
        if (cached) {
          if (!cancelled) setSid(cached)
          return
        }

        const r = await fetch(`/api/submissions/start?slug=${encodeURIComponent(slug)}`)
        const json = (await r.json()) as unknown
        if (!isStartOk(json)) {
          const msg =
            typeof json === 'object' && json && 'error' in json
              ? String((json as StartErr).error)
              : 'Failed to start test'
          throw new Error(msg)
        }

        if (!cancelled) {
          setSid(json.submissionId)
          localStorage.setItem(cacheKey, json.submissionId)
        }
      } catch (err: unknown) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : 'Failed to start test'
          setErr(message)
        }
      } finally {
        if (!cancelled) setBusy(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [sid, slug])

  async function saveDetails() {
    setErr(null)
    if (!sid) {
      setErr('No submission id yet — please wait and try again.')
      return
    }
    if (!first || !last || !email) {
      setErr('Please enter first name, last name and a valid email.')
      return
    }
    setBusy(true)
    try {
      const r = await fetch(`/api/submissions/${sid}/person`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: first,
          last_name: last,
          email,
          phone: phone || null,
        }),
      })
      if (!r.ok) {
        const j = (await r.json().catch(() => ({}))) as unknown
        const message =
          typeof j === 'object' && j && 'error' in j ? String((j as { error: unknown }).error) : `Save failed (${r.status})`
        throw new Error(message)
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Save failed'
      setErr(message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      {err && (
        <div className="mb-4 rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
          Failed to save details: {err}
        </div>
      )}

      <div className="rounded border px-4 py-4">
        <div className="mb-2 text-lg font-semibold">Your details</div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <input
            placeholder="First name"
            value={first}
            onChange={(e) => setFirst(e.target.value)}
            className="rounded border px-3 py-2"
          />
          <input
            placeholder="Last name"
            value={last}
            onChange={(e) => setLast(e.target.value)}
            className="rounded border px-3 py-2"
          />
          <input
            placeholder="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded border px-3 py-2"
          />
          <input
            placeholder="Phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="rounded border px-3 py-2"
          />
        </div>

        <div className="mt-3 flex items-center gap-3">
          <button
            onClick={saveDetails}
            disabled={busy || !sid}
            className="rounded bg-black px-4 py-2 text-white disabled:opacity-50"
          >
            {busy ? 'Saving…' : 'Save details'}
          </button>

            <div className="text-xs text-neutral-500">
              {sid ? `Submission: ${sid}` : 'Creating submission…'}
            </div>
        </div>
      </div>

      {/* …rest of the test UI… */}
    </div>
  )
}

