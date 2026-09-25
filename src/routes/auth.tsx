import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/lib/auth";
import { BotaoPrimario, CampoSelect, CampoTexto } from "@/components/kit";
import gspLogo from "@/assets/gsp-logo.png.asset.json";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar — VolleyOps" },
      {
        name: "description",
        content: "Acesse o sistema de gestão do time de vôlei: atletas, turmas, torneios e finanças.",
      },
      { property: "og:title", content: "Entrar — VolleyOps" },
      {
        property: "og:description",
        content: "Acesse o sistema de gestão do time de vôlei.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const [modo, setModo] = useState<"entrar" | "criar">("entrar");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [nome, setNome] = useState("");
  const [perfil, setPerfil] = useState("atleta");
  const [carregando, setCarregando] = useState(false);
  const navigate = useNavigate();
  const { session, loading } = useAuth();

  useEffect(() => {
    if (!loading && session) navigate({ to: "/" });
  }, [session, loading, navigate]);

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setCarregando(true);
    try {
      if (modo === "criar") {
        const { error } = await supabase.auth.signUp({
          email,
          password: senha,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: { nome, perfil },
          },
        });
        if (error) throw error;
        toast.success("Conta criada! Confirme o e-mail para entrar.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
        if (error) throw error;
        navigate({ to: "/" });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Não foi possível continuar.";
      toast.error(
        msg.includes("Invalid login") ? "E-mail ou senha incorretos." : msg,
      );
    } finally {
      setCarregando(false);
    }
  };

  const entrarComGoogle = async () => {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("Não foi possível entrar com o Google.");
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/" });
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <div className="mx-auto w-full max-w-sm px-5 py-10 flex-1 flex flex-col justify-center">
        <div className="flex items-center gap-2.5">
          <img src={gspLogo.url} alt="GSP — Garotas Super Poderosas" className="size-14 rounded-full object-cover" />
          <div className="leading-none">
            <p className="font-display text-[17px] tracking-wide">
              GSP <span className="text-secondary">VOLLEY</span><span className="text-primary">OPS</span>
            </p>
            <p className="font-mono text-[9px] text-muted-foreground mt-1 uppercase tracking-[0.18em]">
              Garotas Super Poderosas
            </p>
          </div>
        </div>

        <h1 className="font-display text-[26px] leading-none mt-6">
          {modo === "entrar" ? "Entrar na quadra" : "Criar acesso"}
        </h1>
        <p className="text-[13px] text-muted-foreground mt-2">
          Atletas, turmas, torneios, mensalidades e materiais em um só painel.
        </p>

        <form onSubmit={enviar} className="mt-6 space-y-3">
          {modo === "criar" ? (
            <>
              <CampoTexto
                rotulo="Nome completo"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Marina Costa"
                required
              />
              <CampoSelect
                rotulo="Seu perfil"
                value={perfil}
                onChange={(e) => setPerfil(e.target.value)}
              >
                <option value="atleta">Atleta</option>
                <option value="professor">Professor</option>
              </CampoSelect>
            </>
          ) : null}
          <CampoTexto
            rotulo="E-mail"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="voce@email.com"
            required
          />
          <CampoTexto
            rotulo="Senha"
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            placeholder="••••••••"
            minLength={6}
            required
          />
          <BotaoPrimario type="submit" disabled={carregando}>
            {carregando ? "Aguarde…" : modo === "entrar" ? "Entrar" : "Criar conta"}
          </BotaoPrimario>
        </form>

        <button
          onClick={entrarComGoogle}
          className="mt-3 w-full rounded-[8px] border border-line bg-surface py-3 text-[13px] font-semibold"
        >
          Continuar com Google
        </button>

        <button
          onClick={() => setModo(modo === "entrar" ? "criar" : "entrar")}
          className="mt-5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground"
        >
          {modo === "entrar" ? "Não tem acesso? Criar conta →" : "Já tem conta? Entrar →"}
        </button>

        <p className="mt-6 font-mono text-[9px] text-muted-foreground leading-relaxed">
          O primeiro cadastro confirmado recebe o perfil de gestora, com acesso total.
        </p>
      </div>
    </div>
  );
}
