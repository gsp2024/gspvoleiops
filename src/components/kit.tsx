import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

export function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("panel p-3", className)}>{children}</div>;
}

export function MetricCard({
  rotulo,
  valor,
  nota,
  tom = "neutro",
  atraso = 0,
}: {
  rotulo: string;
  valor: ReactNode;
  nota?: string;
  tom?: "neutro" | "sucesso" | "perigo" | "primario";
  atraso?: number;
}) {
  const tomValor = {
    neutro: "text-foreground",
    sucesso: "text-success",
    perigo: "text-danger",
    primario: "text-primary",
  }[tom];
  return (
    <div className="rise panel p-3" style={{ animationDelay: `${atraso}ms` }}>
      <p className="label-mono">{rotulo}</p>
      <p className={cn("font-display text-[24px] mt-1.5 leading-none", tomValor)}>{valor}</p>
      {nota ? <p className="font-mono text-[10px] text-muted-foreground mt-1.5">{nota}</p> : null}
    </div>
  );
}

export function SectionHeader({
  titulo,
  acao,
  para,
  onClick,
}: {
  titulo: string;
  acao?: string;
  para?: string;
  onClick?: () => void;
}) {
  return (
    <div className="flex items-center justify-between mb-2">
      <h2 className="font-display text-[15px] tracking-wide">{titulo}</h2>
      {acao && para ? (
        <Link to={para} className="font-mono text-[10px] text-muted-foreground">
          {acao} →
        </Link>
      ) : acao ? (
        <button onClick={onClick} className="font-mono text-[10px] text-muted-foreground">
          {acao} →
        </button>
      ) : null}
    </div>
  );
}

export function Pill({
  children,
  tom = "neutro",
}: {
  children: ReactNode;
  tom?: "neutro" | "sucesso" | "perigo" | "alerta";
}) {
  const tons = {
    neutro: "bg-surface-2 text-muted-foreground",
    sucesso: "bg-success/15 text-success",
    perigo: "bg-danger/15 text-danger",
    alerta: "bg-warning/15 text-warning",
  };
  return (
    <span
      className={cn(
        "shrink-0 font-mono text-[9px] uppercase tracking-wide px-2 py-1 rounded-full",
        tons[tom],
      )}
    >
      {children}
    </span>
  );
}

export function ListRow({
  titulo,
  subtitulo,
  direita,
  inicial,
  onClick,
}: {
  titulo: string;
  subtitulo?: string;
  direita?: ReactNode;
  inicial?: string;
  onClick?: () => void;
}) {
  const Wrapper = onClick ? "button" : "div";
  return (
    <Wrapper
      onClick={onClick}
      className={cn("flex w-full items-center gap-3 p-2.5 text-left", onClick && "active:bg-surface-2")}
    >
      {inicial !== undefined ? (
        <div className="size-9 shrink-0 rounded-[7px] bg-surface-2 grid place-items-center text-[11px] font-semibold text-primary">
          {inicial}
        </div>
      ) : null}
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold truncate">{titulo}</p>
        {subtitulo ? (
          <p className="font-mono text-[10px] text-muted-foreground truncate">{subtitulo}</p>
        ) : null}
      </div>
      {direita}
    </Wrapper>
  );
}

export function ListaPanel({ children }: { children: ReactNode }) {
  return <div className="panel divide-y divide-line overflow-hidden">{children}</div>;
}

export function Vazio({ texto }: { texto: string }) {
  return (
    <div className="panel p-6 text-center">
      <p className="text-[13px] text-muted-foreground">{texto}</p>
    </div>
  );
}

export function BotaoPrimario({
  children,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={cn(
        "w-full rounded-[8px] bg-primary text-primary-foreground font-display text-[15px] tracking-wide py-3 active:scale-[0.99] disabled:opacity-50",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function CampoTexto({
  rotulo,
  ...props
}: { rotulo: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="label-mono">{rotulo}</span>
      <input
        {...props}
        className="mt-1 w-full rounded-[8px] bg-surface-2 border border-line px-3 py-2.5 text-[13px] text-foreground placeholder:text-muted-foreground outline-none focus:border-primary"
      />
    </label>
  );
}

export function CampoSelect({
  rotulo,
  children,
  ...props
}: { rotulo: string } & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <label className="block">
      <span className="label-mono">{rotulo}</span>
      <select
        {...props}
        className="mt-1 w-full rounded-[8px] bg-surface-2 border border-line px-3 py-2.5 text-[13px] text-foreground outline-none focus:border-primary"
      >
        {children}
      </select>
    </label>
  );
}
