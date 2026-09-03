// Copy to config.js and fill in. config.js is gitignored.
//
// The publishable key is MEANT to ship in the browser: it identifies the
// project, it does not grant access. Row-level security is what protects the
// data - every policy is scoped to auth.uid(), so a signed-in user can only
// ever read or write their own rows.
//
// The service-role key and the routine token never appear here. They live in
// Supabase's own secret storage, server side.

export const SUPABASE_URL = "https://YOUR-PROJECT.supabase.co";
export const SUPABASE_KEY = "sb_publishable_YOUR_KEY";
