import {
  createClient as createSupabaseClient,
  type SupabaseClient,
} from "@supabase/supabase-js";

// We don't generate Database types — every table has untyped Row/Insert/Update.
// Typing the client as SupabaseClient<any, any, any> avoids `never`-typed inserts.
export type AnyClient = SupabaseClient<any, any, any>;

let _client: AnyClient | null = null;

export function createClient(): AnyClient {
  if (_client) return _client;
  _client = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
  return _client;
}
