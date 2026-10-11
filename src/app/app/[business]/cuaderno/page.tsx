import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getBusinessBySlug } from "@/lib/data/business";
import { CuadernoClient, type Entry } from "./CuadernoClient";

export default async function CuadernoPage({ params }: { params: Promise<{ business: string }> }) {
  const { business: slug } = await params;
  const supabase = await createClient();
  const business = await getBusinessBySlug(supabase, slug);
  if (!business) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: membership } = await supabase
    .from("business_members")
    .select("id, role")
    .eq("business_id", business.id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!membership) redirect(`/app/${slug}/reservas`);

  const isAdmin = membership.role === "owner" || membership.role === "admin";

  const [{ data: services }, { data: entries }] = await Promise.all([
    supabase.from("services").select("id, name, price").eq("business_id", business.id).eq("is_active", true).order("name"),
    isAdmin
      ? supabase
          .from("notebook_entries")
          .select("id, business_member_id, service_id, service_name, client_name, amount, note, performed_at, status, created_at, business_members(profiles(full_name))")
          .eq("business_id", business.id)
          .order("created_at", { ascending: false })
      : supabase
          .from("notebook_entries")
          .select("id, business_member_id, service_id, service_name, client_name, amount, note, performed_at, status, created_at")
          .eq("business_id", business.id)
          .eq("business_member_id", membership.id)
          .order("created_at", { ascending: false }),
  ]);

  return (
    <CuadernoClient
      businessId={business.id}
      memberId={membership.id}
      isAdmin={isAdmin}
      services={services ?? []}
      initialEntries={(entries ?? []) as unknown as Entry[]}
    />
  );
}
