import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth, type Papel } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";

export function Protegido({
  children,
  papeis,
}: {
  children: React.ReactNode;
  papeis?: Papel[];
}) {
  const { session, papel, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/auth" });
  }, [loading, session, navigate]);

  if (loading || !session) {
    return (
      <div className="min-h-screen grid place-items-center bg-background">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          Carregando…
        </p>
      </div>
    );
  }

  if (papeis && papel && !papeis.includes(papel)) {
    return (
      <AppShell>
        <div className="panel p-6 text-center">
          <p className="font-display text-[18px]">Acesso restrito</p>
          <p className="text-[13px] text-muted-foreground mt-2">
            Esta área é exclusiva da gestora do time.
          </p>
        </div>
      </AppShell>
    );
  }

  return <AppShell>{children}</AppShell>;
}
