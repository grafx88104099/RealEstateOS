// Loose-typed admin client for Phase 2 tables (ai_conversations, ai_messages,
// offers, viewings) until Supabase types are regenerated.
// Once `supabase gen types` is rerun against the live DB, switch back to the
// strongly-typed `supabaseAdmin` import.

import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "./admin";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const supabaseAdminLoose = supabaseAdmin as unknown as SupabaseClient<any, any, any>;
