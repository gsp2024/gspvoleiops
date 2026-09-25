import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Protegido } from "@/lib/guard";
import { BotaoPrimario, CampoTexto, Panel, Pill } from "@/components/kit";

export const Route = createFileRoute("/perfil")({
  head: () => ({ meta: [
    { title: "Meu perfil — VolleyOps" },
    { name: "description", content: "Atualize seus dados pessoais e esportivos no VolleyOps." },
    { property: "og:title", content: "Meu perfil — VolleyOps" },
    { property: "og:description", content: "Dados pessoais e esportivos do usuário." },
  ] }),
  component: () => <Protegido><Perfil /></Protegido>,
});

function Perfil() {
  const { perfil, papel, user, refresh } = useAuth();
  const [salvando, setSalvando] = useState(false);
  const [form, setForm] = useState({ nome: "", telefone: "", documento: "", data_nascimento: "", posicao: "" });
  useEffect(() => {
    if (!perfil) return;
    setForm({ nome: perfil.nome ?? "", telefone: perfil.telefone ?? "", documento: perfil.documento ?? "", data_nascimento: perfil.data_nascimento ?? "", posicao: perfil.posicao ?? "" });
  }, [perfil]);
  const salvar = async () => {
    if (!user) return;
    setSalvando(true);
    const { error } = await supabase.from("profiles").update({ ...form, data_nascimento: form.data_nascimento || null, onboarding_completo: true }).eq("id", user.id);
    setSalvando(false);
    if (error) { toast.error("Não foi possível atualizar o perfil."); return; }
    await refresh();
    toast.success("Perfil atualizado.");
  };
  return <>
    <div className="rise"><p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Conta</p><h1 className="font-display text-[26px] leading-none mt-1">Meu perfil</h1><div className="mt-2"><Pill tom="alerta">{papel ?? "usuário"}</Pill></div></div>
    <Panel className="space-y-3"><CampoTexto rotulo="Nome completo" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /><CampoTexto rotulo="E-mail" value={perfil?.email ?? ""} disabled /><CampoTexto rotulo="Telefone" value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} /><CampoTexto rotulo="Documento" value={form.documento} onChange={(e) => setForm({ ...form, documento: e.target.value })} /><div className="grid grid-cols-2 gap-2.5"><CampoTexto rotulo="Nascimento" type="date" value={form.data_nascimento} onChange={(e) => setForm({ ...form, data_nascimento: e.target.value })} /><CampoTexto rotulo="Posição" value={form.posicao} onChange={(e) => setForm({ ...form, posicao: e.target.value })} placeholder="Levantadora" /></div><BotaoPrimario onClick={salvar} disabled={salvando}>{salvando ? "Salvando…" : "Salvar alterações"}</BotaoPrimario></Panel>
  </>;
}