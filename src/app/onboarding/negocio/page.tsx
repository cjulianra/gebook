"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input, Label, FieldError, Select } from "@/components/ui/Input";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";

const BUSINESS_TYPES = [
  "Salón de belleza",
  "Barbería",
  "Spa de uñas",
  "Estudio de pestañas",
  "Estudio de cejas",
  "Spa / centro de estética",
  "Otro",
];

function slugify(input: string) {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// Segmentos de la raíz del sitio que ya usa el sistema — ningún negocio puede quedarse con ellos.
const RESERVED_SLUGS = new Set(["login", "register", "app", "admin", "onboarding", "portal", "api"]);

async function findAvailableSlug(supabase: ReturnType<typeof createClient>, base: string) {
  let candidate = base;
  let suffix = 2;
  for (;;) {
    if (!RESERVED_SLUGS.has(candidate)) {
      const { data } = await supabase.from("businesses").select("id").eq("slug", candidate).maybeSingle();
      if (!data) return candidate;
    }
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
}

export default function OnboardingNegocioPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [type, setType] = useState(BUSINESS_TYPES[0]);
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("Tu sesión expiró. Inicia sesión de nuevo.");
      setLoading(false);
      router.replace("/login");
      return;
    }

    const slug = await findAvailableSlug(supabase, slugify(name) || "negocio");

    const { data: business, error: businessError } = await supabase
      .from("businesses")
      .insert({ name, slug, business_type: type, phone: phone || null, owner_id: user.id })
      .select()
      .single();

    if (businessError || !business) {
      setError("No pudimos crear tu negocio. Intenta de nuevo.");
      setLoading(false);
      return;
    }

    const { error: memberError } = await supabase
      .from("business_members")
      .insert({ business_id: business.id, user_id: user.id, role: "owner", status: "active" });

    setLoading(false);

    if (memberError) {
      setError("Tu negocio se creó pero hubo un problema asignando tu rol. Contacta soporte.");
      return;
    }

    router.replace(`/app/${business.slug}/reservas`);
    router.refresh();
  }

  return (
    <div className="gradient-canvas flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <h1 className="text-lg font-semibold text-[var(--color-ink-900)]">Cuéntanos de tu negocio</h1>
          <p className="mt-1 text-sm text-[var(--color-ink-500)]">Esto toma menos de un minuto. Podrás ajustarlo después.</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Datos del negocio</CardTitle>
          </CardHeader>
          <CardBody>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Nombre del negocio</Label>
                <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Studio Bella" />
              </div>
              <div>
                <Label htmlFor="type">Tipo de negocio</Label>
                <Select id="type" value={type} onChange={(e) => setType(e.target.value)}>
                  {BUSINESS_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor="phone">Teléfono (opcional)</Label>
                <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="300 123 4567" />
              </div>
              <FieldError>{error ?? undefined}</FieldError>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Creando negocio…" : "Crear negocio y continuar"}
              </Button>
            </form>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
