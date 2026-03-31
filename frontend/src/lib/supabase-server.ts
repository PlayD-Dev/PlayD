import { createClient } from '@supabase/supabase-js'

/**
 * Server-side Supabase admin client using the service role key.
 * NEVER import this file in client components — it exposes the service role key.
 * Use only in Next.js API routes and Server Components.
 */
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)
