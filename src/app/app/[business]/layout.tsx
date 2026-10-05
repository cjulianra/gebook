import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BusinessProvider } from "@/lib/context/BusinessContext";
import { AppShell } from "@/components/layout/AppShell";
import { ToastProvider } from "@/components/ui/Toast";
import type { MemberRole } from "@/lib/types/database";

export default async function BusinessLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ business: string }>;
}) {
  const { business: slug } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: business } = await supabase
    .from("businesses")
    .select("id, name, slug, business_type, logo_url")
    .eq("slug", slug)
    .maybeSingle();

  if (!business) redirect("/app");

  const { data: membershipRaw } = await supabase
    .from("business_members")
    .select("id, role, status, employee_details(can_create_bookings)")
    .eq("business_id", business.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membershipRaw) redirect("/app");

  const membership = membershipRaw as unknown as {
    id: string;
    role: MemberRole;
    status: string;
    employee_details: { can_create_bookings: boolean } | { can_create_bookings: boolean }[] | null;
  };

  if (membership.status !== "active") redirect("/app");
  const employeeDetails = Array.isArray(membership.employee_details) ? membership.employee_details[0] : membership.employee_details;
  const canCreateBookings = membership.role !== "employee" || (employeeDetails?.can_create_bookings ?? true);

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, email, avatar_url")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  return (
    <ToastProvider>
      <BusinessProvider
        value={{
          business,
          membership: { id: membership.id, role: membership.role, canCreateBookings },
          profile,
        }}
      >
        <AppShell>{children}</AppShell>
      </BusinessProvider>
    </ToastProvider>
  );
}
