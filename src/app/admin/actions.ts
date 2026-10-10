"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function assertSuperAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado." } as const;

  const { data: profile } = await supabase.from("profiles").select("is_super_admin").eq("id", user.id).single();
  if (!profile?.is_super_admin) return { error: "No autorizado." } as const;

  return { ok: true } as const;
}

export async function setBusinessActive(businessId: string, isActive: boolean) {
  const auth = await assertSuperAdmin();
  if ("error" in auth) return auth;

  const admin = createAdminClient();
  const { error } = await admin.from("businesses").update({ is_active: isActive }).eq("id", businessId);
  if (error) return { error: "No pudimos actualizar el negocio." };

  return { data: true };
}
