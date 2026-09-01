import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const CLEANUP_SECRET = Deno.env.get('CLEANUP_SECRET')!
const BUCKET = 'files'
const RETENTION_MS = 30 * 24 * 60 * 60 * 1000

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cleanup-secret',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const secret = req.headers.get('x-cleanup-secret')
  if (!CLEANUP_SECRET || secret !== CLEANUP_SECRET) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    const cutoff = Date.now() - RETENTION_MS
    const expiredPaths: string[] = []
    let offset = 0
    const pageSize = 1000

    while (true) {
      const { data, error } = await supabase.storage.from(BUCKET).list('', {
        limit: pageSize,
        offset,
        sortBy: { column: 'created_at', order: 'asc' },
      })

      if (error) throw error
      const items = data ?? []

      for (const item of items) {
        if (!item.created_at || item.id == null) continue
        if (new Date(item.created_at).getTime() < cutoff) {
          expiredPaths.push(item.name)
        }
      }

      if (items.length < pageSize) break
      offset += pageSize
    }

    let deleted = 0
    const failures: { path: string; error: string }[] = []

    for (let i = 0; i < expiredPaths.length; i += 100) {
      const batch = expiredPaths.slice(i, i + 100)
      const { data, error } = await supabase.storage.from(BUCKET).remove(batch)
      if (error) {
        failures.push({ path: batch.join(', '), error: error.message })
      } else {
        deleted += data?.length ?? batch.length
      }
    }

    return new Response(JSON.stringify({
      ok: failures.length === 0,
      cutoff: new Date(cutoff).toISOString(),
      found: expiredPaths.length,
      deleted,
      failures,
    }), {
      status: failures.length ? 207 : 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
