// app/api/submissions/[id]/person/route.ts
import { NextResponse } from 'next/server'

type RouteParams = { params: { id: string } }

type PersonBody = {
  first_name: string
  last_name: string
  email: string
  phone?: string | null
}

function isValidEmail(s: string): boolean {
  // lightweight check; keep it simple server-side
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)
}

export async function POST(req: Request, { params }: RouteParams) {
  const { id } = params
  if (!id) {
    return NextResponse.json({ error: 'Missing submission id' }, { status: 400 })
  }

  let payloadUnknown: unknown
  try {
    payloadUnknown = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const body = payloadUnknown as Partial<PersonBody>

  if (!body.first_name || !body.last_name || !body.email) {
    return NextResponse.json(
      { error: 'first_name, last_name and email are required' },
      { status: 400 }
    )
  }
  if (!isValidEmail(body.email)) {
    return NextResponse.json({ error: 'Email is not valid' }, { status: 400 })
  }

  // TODO: write to your DB (mc_submissions), e.g.:
  // await db.query(
  //   `update mc_submissions
  //      set first_name=$1, last_name=$2, email=$3, phone=$4
  //    where id=$5`,
  //   [body.first_name, body.last_name, body.email, body.phone ?? null, id]
  // )

  // For now, respond success so the UI can proceed.
  return NextResponse.json({ ok: true })
}

// If someone calls GET/PUT/etc., make that explicit (prevents 405 confusion in logs)
export async function GET() {
  return NextResponse.json({ error: 'Method Not Allowed' }, { status: 405 })
}
export async function PUT() {
  return NextResponse.json({ error: 'Method Not Allowed' }, { status: 405 })
}
export async function DELETE() {
  return NextResponse.json({ error: 'Method Not Allowed' }, { status: 405 })
}
