import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const startTime = Date.now()
  try {
    const supabase = await createClient()
    const { error } = await supabase.from('shops').select('id').limit(1)

    return NextResponse.json({
      status: error ? 'degraded' : 'healthy',
      app: "Heaven's Cafe Management System",
      timestamp: new Date().toISOString(),
      database: error ? `error: ${error.message}` : 'connected',
      latencyMs: Date.now() - startTime,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json(
      {
        status: 'error',
        error: msg,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}
