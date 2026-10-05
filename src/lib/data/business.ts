import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";

export async function getBusinessBySlug(supabase: SupabaseClient<Database>, slug: string) {
  const { data } = await supabase.from("businesses").select("id, name, slug, business_type").eq("slug", slug).maybeSingle();
  return data;
}
