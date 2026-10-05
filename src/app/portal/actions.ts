"use server";

import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Al registrarse, un cliente "reclama" cualquier fila de `clients` que algún
 * negocio ya haya creado con su mismo correo (ej. lo agendaron por teléfono
 * antes de que tuviera cuenta). Une su identidad global con ese historial.
 */
export async function claimClientRecords(userId: string, email: string) {
  const admin = createAdminClient();
  const { error } = await admin
    .from("clients")
    .update({ user_id: userId })
    .is("user_id", null)
    .ilike("email", email);

  if (error) {
    return { error: "No pudimos vincular tu historial anterior, pero tu cuenta quedó creada." };
  }
  return { data: true };
}
