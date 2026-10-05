import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function AppIndexPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: memberships } = await supabase
    .from("business_members")
    .select("business_id, businesses(slug)")
    .eq("user_id", user.id)
    .eq("status", "active");

  const first = memberships?.[0] as unknown as { businesses: { slug: string } } | undefined;

  if (!first) {
    const { count } = await supabase
      .from("clients")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);
    redirect(count && count > 0 ? "/portal" : "/onboarding/negocio");
  }

  redirect(`/app/${first.businesses.slug}/dashboard`);
}
