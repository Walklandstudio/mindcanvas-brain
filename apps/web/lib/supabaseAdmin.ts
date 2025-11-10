// apps/web/lib/supabaseAdmin.ts
// Compatibility shim so imports like "@/lib/supabaseAdmin" still work.
export {
  createClient,
  supabaseAdmin,
  sbAdmin,
} from './server/supabaseAdmin';
