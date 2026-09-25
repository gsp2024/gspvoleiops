import type { ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { LayoutGrid, Users, Trophy, Wallet, Bell, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import gspLogo from "@/assets/gsp-logo.png.asset.json";

const nav = [
  { to: "/", rotulo: "Painel", Icone: LayoutGrid },
  { to: "/turmas", rotulo: "Turmas", Icone: Users },
  { to: "/torneios", rotulo: "Torneios", Icone: Trophy },
  { to: "/financeiro", rotulo: "Caixa", Icone: Wallet },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const { perfil, papel } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const iniciais = (perfil?.nome || perfil?.email || "?")
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

  const sair = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-line">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 h-14">
          <Link to="/" className="flex items-center gap-2.5">
            <img src={gspLogo.url} alt="GSP — Garotas Super Poderosas" className="size-9 rounded-full object-cover" />
            <div className="leading-none">
              <p className="font-display text-[15px] tracking-wide">
                GSP <span className="text-secondary">VOLLEY</span><span className="text-primary">OPS</span>
              </p>
              <p className="font-mono text-[9px] text-muted-foreground mt-0.5 uppercase">
                {papel ?? "gestão"} · temporada {new Date().getFullYear()}
              </p>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <Link
              to="/uniformes"
              className="relative size-9 grid place-items-center rounded-[8px] border border-line text-muted-foreground"
              aria-label="Pedidos de uniforme"
            >
              <Bell className="size-4" />
            </Link>
            <Link
              to="/perfil"
              className="flex items-center gap-2 pl-2 pr-1 py-1 rounded-[8px] border border-line"
            >
              <div className="size-7 rounded-[6px] bg-surface-2 grid place-items-center text-[11px] font-semibold text-primary">
                {iniciais}
              </div>
              <span className="text-xs font-medium max-w-24 truncate">
                {perfil?.nome || "Meu perfil"}
              </span>
            </Link>
            <button
              onClick={sair}
              aria-label="Sair"
              className="size-9 grid place-items-center rounded-[8px] border border-line text-muted-foreground"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 pt-4 pb-28 space-y-4">{children}</main>

      <nav className="fixed bottom-0 inset-x-0 z-20 bg-surface border-t border-line">
        <div className="mx-auto max-w-3xl grid grid-cols-4 h-16">
          {nav.map(({ to, rotulo, Icone }) => {
            const ativo = to === "/" ? pathname === "/" : pathname.startsWith(to);
            return (
              <Link
                key={to}
                to={to}
                className={cn(
                  "flex flex-col items-center justify-center gap-1",
                  ativo ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Icone className="size-[18px]" />
                <span className="font-mono text-[9px] uppercase tracking-wide">{rotulo}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
