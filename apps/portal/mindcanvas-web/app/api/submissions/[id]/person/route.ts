// app/api/submissions/[id]/person/route.ts
import { NextResponse, NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(url, serviceKey, { auth: { persistSession: false } })

type Body = {
  first_name: string
  last_name: string
  email: string
  phone?: string | null
}

const UUID_RX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id?.trim()
    if (!id || !UUID_RX.test(id)) {
      return NextResponse.json(
        { error: `Invalid submission id '${id ?? ''}'` },
        { status: 400 }
      )
    }

    const raw = (await req.json()) as unknown

    // Narrow unknown -> Body (simple, explicit checks)
    const b = raw as Partial<Body>
    const first = (b.first_name ?? '').trim()
    const last = (b.last_name ?? '').trim()
    const email = (b.email ?? '').trim()
    const phone = (b.phone ?? '')?.toString().trim()

    if (!first || !last || !email) {
      return NextResponse.json(
        { error: 'first_name, last_name and email are required' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('mc_submissions')
      .update({
        first_name: first,
        last_name: last,
        email,
        phone: phone || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to save'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
