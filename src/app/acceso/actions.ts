"use server";

import { createAdminClient } from "@/lib/supabase/admin";

interface MemberJoin {
  business_member_id: string;
  phone: string | null;
  access_code: string | null;
  business_members: {
    id: string;
    user_id: string;
    status: string;
    role: string;
    businesses: { id: string; slug: string } | { id: string; slug: string }[] | null;
  } | {
    id: string;
    user_id: string;
    status: string;
    role: string;
    businesses: { id: string; slug: string } | { id: string; slug: string }[] | null;
  }[] | null;
}

function one<T>(v: T | T[] | null | undefined): T | undefined {
  return Array.isArray(v) ? v[0] : v ?? undefined;
}

function normalizePhone(phone: string) {
  return phone.replace(/\D/g, "");
}

/** Valida celular + código de 4 dígitos y, si coinciden, genera un enlace de
 * acceso (sin correo) que el cliente usa con verifyOtp para crear la sesión. */
export async function requestAccessLink(input: { phone: string; code: string }) {
  const phoneDigits = normalizePhone(input.phone);
  const code = input.code.trim();

  if (phoneDigits.length < 10 || code.length !== 4) {
    return { error: "Revisa tu celular y el código de 4 dígitos." };
  }

  const admin = createAdminClient();

  const { data: rows } = await admin
    .from("employee_details")
    .select("business_member_id, phone, access_code, business_members(id, user_id, status, role, businesses(id, slug))")
    .eq("access_code", code);

  const match = ((rows ?? []) as unknown as MemberJoin[]).find((row) => row.phone && normalizePhone(row.phone) === phoneDigits);

  const member = one(match?.business_members);
  const business = one(member?.businesses);

  if (!match || !member || !business || member.status !== "active" || member.role !== "employee") {
    return { error: "Celular o código incorrectos." };
  }

  const email = `emp-${phoneDigits}-${business.id.slice(0, 8)}@employees.gebook.internal`;
  const { data: link, error: linkError } = await admin.auth.admin.generateLink({ type: "magiclink", email });

  if (linkError || !link) {
    return { error: "No pudimos iniciar tu sesión. Intenta de nuevo." };
  }

  return { data: { tokenHash: link.properties.hashed_token, slug: business.slug } };
}
