import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminShell } from "./AdminShell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("is_super_admin, full_name, email").eq("id", user.id).single();

  if (!profile?.is_super_admin) redirect("/app");

  return <AdminShell fullName={profile.full_name} email={profile.email}>{children}</AdminShell>;
}
