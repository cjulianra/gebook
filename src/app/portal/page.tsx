import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PortalClient } from "./PortalClient";

export default async function PortalPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/portal/login");

  const { data: profile } = await supabase.from("profiles").select("full_name, email").eq("id", user.id).single();

  const { data: clientRows } = await supabase.from("clients").select("id").eq("user_id", user.id);
  const clientIds = (clientRows ?? []).map((c) => c.id);

  const { data: bookings } = clientIds.length
    ? await supabase
        .from("bookings")
        .select(
          "id, start_at, end_at, status, businesses(name), services(name, price), business_members(profiles(full_name))"
        )
        .in("client_id", clientIds)
        .order("start_at", { ascending: false })
    : { data: [] };

  return <PortalClient fullName={profile?.full_name ?? ""} bookings={bookings ?? []} />;
}
