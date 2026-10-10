"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/types/database";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input, Label, Select, FieldError } from "@/components/ui/Input";
import { ToastProvider, useToast } from "@/components/ui/Toast";
import { CITIES, NEIGHBORHOODS_BY_CITY } from "@/lib/data/santanderLocations";
import { cn } from "@/lib/utils/cn";
import { BusinessSchedulePanel, type BusinessSchedule } from "@/components/business/BusinessSchedulePanel";
import { HolidaysPanel, type Holiday } from "@/components/business/HolidaysPanel";
import { InstallNotificationsSettings } from "@/components/pwa/InstallNotificationsSettings";
import { useBusiness } from "@/lib/context/BusinessContext";

type Business = Database["public"]["Tables"]["businesses"]["Row"];

export function ConfiguracionClient({
  business,
  initialSchedules,
  initialHolidays,
}: {
  business: Business;
  initialSchedules: BusinessSchedule[];
  initialHolidays: Holiday[];
}) {
  return (
    <ToastProvider>
      <Inner business={business} initialSchedules={initialSchedules} initialHolidays={initialHolidays} />
    </ToastProvider>
  );
}

function Inner({
  business,
  initialSchedules,
  initialHolidays,
}: {
  business: Business;
  initialSchedules: BusinessSchedule[];
  initialHolidays: Holiday[];
}) {
  const showToast = useToast();
  const { membership } = useBusiness();
  const [schedules, setSchedules] = useState(initialSchedules);
  const [holidays, setHolidays] = useState(initialHolidays);
  const [logoUrl, setLogoUrl] = useState(business.logo_url);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(business.name);
  const [phone, setPhone] = useState(business.phone ?? "");
  const [address, setAddress] = useState(business.address ?? "");
  const [city, setCity] = useState(business.city ?? "");
  const [neighborhood, setNeighborhood] = useState(business.neighborhood ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);
  const [showPrices, setShowPrices] = useState(business.show_prices);
  const [savingPrices, setSavingPrices] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- window solo existe en el cliente; se llena después del primer render para evitar un mismatch de hidratación
    setOrigin(window.location.origin);
  }, []);

  const publicUrl = origin ? `${origin}/${business.slug}` : `/${business.slug}`;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast("No pudimos copiar el link. Selecciónalo y cópialo manualmente.", "danger");
    }
  }

  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showToast("Sube un archivo de imagen.", "danger");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      showToast("La imagen debe pesar menos de 2 MB.", "danger");
      return;
    }

    setUploading(true);
    const supabase = createClient();
    const ext = file.name.split(".").pop();
    const path = `${business.id}/logo-${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage.from("logos").upload(path, file, { upsert: true });
    if (uploadError) {
      setUploading(false);
      showToast("No pudimos subir el logo.", "danger");
      return;
    }

    const { data: publicUrl } = supabase.storage.from("logos").getPublicUrl(path);
    const { error: updateError } = await supabase.from("businesses").update({ logo_url: publicUrl.publicUrl }).eq("id", business.id);

    setUploading(false);
    if (updateError) {
      showToast("Subimos la imagen pero no pudimos guardarla.", "danger");
      return;
    }

    setLogoUrl(publicUrl.publicUrl);
    showToast("Logo actualizado.");
  }

  async function handleShowPricesChange(checked: boolean) {
    setShowPrices(checked);
    setSavingPrices(true);
    const supabase = createClient();
    const { error } = await supabase.from("businesses").update({ show_prices: checked }).eq("id", business.id);
    setSavingPrices(false);
    if (error) {
      setShowPrices(!checked);
      showToast("No pudimos guardar el cambio.", "danger");
      return;
    }
    showToast(checked ? "Los precios ahora se muestran a los clientes." : "Los precios ya no se muestran a los clientes.");
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return setError("El nombre es obligatorio.");
    setError(null);
    setSaving(true);

    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("businesses")
      .update({
        name: name.trim(),
        phone: phone.trim() || null,
        address: address.trim() || null,
        city: city || null,
        neighborhood: neighborhood || null,
      })
      .eq("id", business.id);

    setSaving(false);
    if (updateError) {
      setError("No pudimos guardar los cambios.");
      return;
    }
    showToast("Datos del negocio actualizados.");
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4 md:p-8">
      <PageHeader title="Configuración" description="La información pública de tu negocio." />

      <Card>
        <CardHeader>
          <CardTitle>Link público de reservas</CardTitle>
        </CardHeader>
        <CardBody>
          <p className="mb-3 text-sm text-[var(--color-ink-500)]">
            Comparte este link con tus clientes para que agenden directamente.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="flex-1 overflow-x-auto rounded-[var(--radius-md)] border border-[var(--color-border-strong)] bg-[var(--color-canvas)] px-4 py-2.5 text-sm font-medium text-[var(--color-ink-900)] whitespace-nowrap">
              {publicUrl}
            </div>
            <Button type="button" variant="secondary" className="w-full sm:w-auto" onClick={handleCopy}>
              {copied ? "¡Copiado!" : "Copiar link"}
            </Button>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Instalación y notificaciones</CardTitle>
        </CardHeader>
        <CardBody>
          <InstallNotificationsSettings memberId={membership.id} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Precios</CardTitle>
        </CardHeader>
        <CardBody>
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={showPrices}
              disabled={savingPrices}
              onChange={(e) => handleShowPricesChange(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-[var(--color-border-strong)] text-[var(--color-accent)] focus:ring-[var(--color-accent)]"
            />
            <span>
              <span className="block text-sm font-medium text-[var(--color-ink-900)]">Mostrar precios a los clientes</span>
              <span className="block text-xs text-[var(--color-ink-500)]">
                Si lo desactivas, tus clientes verán el nombre y la duración de cada servicio, pero no el precio, en la página pública de
                reservas.
              </span>
            </span>
          </label>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Horario de atención</CardTitle>
        </CardHeader>
        <CardBody>
          <p className="mb-4 text-sm text-[var(--color-ink-500)]">
            Este horario aplica para todos los empleados del negocio. Para bloquear a un empleado puntual algún día, hazlo desde
            Empleados.
          </p>
          <BusinessSchedulePanel
            businessId={business.id}
            schedules={schedules}
            onSaved={(saved) => {
              setSchedules(saved);
              showToast("Horario actualizado.");
            }}
          />
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Días festivos</CardTitle>
        </CardHeader>
        <CardBody>
          <HolidaysPanel businessId={business.id} holidays={holidays} onChange={setHolidays} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Logo</CardTitle>
        </CardHeader>
        <CardBody>
          <div className="flex flex-col items-start gap-4">
            <div
              className={cn(
                "flex h-20 max-w-full shrink-0 items-center justify-center overflow-hidden rounded-[var(--radius-md)]",
                logoUrl ? "min-w-20 bg-[var(--color-canvas)] px-2" : "w-20 [background:var(--gradient-accent)]"
              )}
            >
              {logoUrl ? (
                // Los logos suelen ser horizontales: se muestra completo (sin
                // recortar), con alto fijo y ancho libre según su proporción.
                // eslint-disable-next-line @next/next/no-img-element -- logo lives in Supabase Storage, a dynamic external host
                <img src={logoUrl} alt={business.name} className="h-full w-auto max-w-full object-contain" />
              ) : (
                <span className="text-2xl font-semibold text-[var(--color-accent-ink)]">{business.name[0]?.toUpperCase()}</span>
              )}
            </div>
            <div>
              <Button type="button" variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                {uploading ? "Subiendo…" : logoUrl ? "Cambiar logo" : "Subir logo"}
              </Button>
              <p className="mt-1.5 text-xs text-[var(--color-ink-500)]">PNG o JPG, máximo 2 MB.</p>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
            </div>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Datos del negocio</CardTitle>
        </CardHeader>
        <CardBody>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <Label htmlFor="name">Nombre</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="phone">Teléfono</Label>
              <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="address">Dirección</Label>
              <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="city">Ciudad</Label>
                <Select
                  id="city"
                  value={city}
                  onChange={(e) => {
                    setCity(e.target.value);
                    setNeighborhood("");
                  }}
                >
                  <option value="">Selecciona una ciudad</option>
                  {CITIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor="neighborhood">Barrio</Label>
                <Select
                  id="neighborhood"
                  value={neighborhood}
                  onChange={(e) => setNeighborhood(e.target.value)}
                  disabled={!city}
                >
                  <option value="">{city ? "Selecciona un barrio" : "Elige una ciudad primero"}</option>
                  {city &&
                    NEIGHBORHOODS_BY_CITY[city as keyof typeof NEIGHBORHOODS_BY_CITY]?.map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                </Select>
              </div>
            </div>
            <FieldError>{error ?? undefined}</FieldError>
            <Button type="submit" disabled={saving}>
              {saving ? "Guardando…" : "Guardar cambios"}
            </Button>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
