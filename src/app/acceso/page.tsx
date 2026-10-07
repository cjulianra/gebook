"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input, Label, FieldError } from "@/components/ui/Input";
import { Card, CardBody } from "@/components/ui/Card";
import { requestAccessLink } from "./actions";

export default function AccesoPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const result = await requestAccessLink({ phone, code });
    if (result.error || !result.data) {
      setLoading(false);
      setError(result.error ?? "No pudimos validar tus datos.");
      return;
    }

    const supabase = createClient();
    const { error: verifyError } = await supabase.auth.verifyOtp({ token_hash: result.data.tokenHash, type: "magiclink" });
    setLoading(false);

    if (verifyError) {
      setError("No pudimos iniciar tu sesión. Intenta de nuevo.");
      return;
    }

    router.replace(`/app/${result.data.slug}/reservas`);
    router.refresh();
  }

  return (
    <div className="gradient-canvas flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-[var(--radius-md)] text-lg font-semibold text-[var(--color-accent-ink)] shadow-[var(--shadow-sm)] [background:var(--gradient-accent)]">
            G
          </div>
          <h1 className="text-lg font-semibold text-[var(--color-ink-900)]">Acceso de empleados</h1>
          <p className="text-sm text-[var(--color-ink-500)]">Ingresa con tu celular y el código que te compartieron.</p>
        </div>
        <Card>
          <CardBody>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="phone">Celular</Label>
                <Input
                  id="phone"
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="300 123 4567"
                />
              </div>
              <div>
                <Label htmlFor="code">Código de acceso</Label>
                <Input
                  id="code"
                  required
                  inputMode="numeric"
                  maxLength={4}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  placeholder="0000"
                  className="text-center text-lg tracking-[0.5em]"
                />
              </div>
              <FieldError>{error ?? undefined}</FieldError>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Ingresando…" : "Ingresar"}
              </Button>
            </form>
          </CardBody>
          <div className="px-5 pb-5 text-center text-xs text-[var(--color-ink-400)]">
            ¿Eres dueño o administrador?{" "}
            <Link href="/login" className="underline">
              Entra aquí
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
