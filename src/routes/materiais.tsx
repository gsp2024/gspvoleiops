import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Protegido } from "@/lib/guard";
import { BotaoPrimario, CampoSelect, CampoTexto, ListRow, ListaPanel, Panel, Pill, Vazio } from "@/components/kit";

export const Route = createFileRoute("/materiais")({
  head: () => ({ meta: [
    { title: "Materiais — VolleyOps" },
    { name: "description", content: "Estoque e movimentação dos materiais usados nos treinos." },
    { property: "og:title", content: "Materiais — VolleyOps" },
    { property: "og:description", content: "Controle de estoque dos materiais do time." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: () => <Protegido papeis={["gestora", "professor"]}><Materiais /></Protegido>,
});

function Materiais() {
  const { papel } = useAuth();
  const qc = useQueryClient();
  const [novo, setNovo] = useState(false);
  const [form, setForm] = useState({ nome: "", unidade: "un", quantidade: "0", minimo: "2" });
  const [mov, setMov] = useState<{ id: string; tipo: string; quantidade: string } | null>(null);
  const { data = [] } = useQuery({ queryKey: ["materiais"], queryFn: async () => (await supabase.from("materiais").select("*").order("nome")).data ?? [] });

  const criar = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("materiais").insert({ nome: form.nome, unidade: form.unidade, quantidade: Number(form.quantidade), minimo: Number(form.minimo) });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Material cadastrado."); setNovo(false); setForm({ nome: "", unidade: "un", quantidade: "0", minimo: "2" }); void qc.invalidateQueries({ queryKey: ["materiais"] }); },
  });
  const movimentar = useMutation({
    mutationFn: async () => {
      if (!mov) return;
      const atual = data.find((m) => m.id === mov.id);
      if (!atual) return;
      const quantidade = Number(mov.quantidade);
      const novoSaldo = mov.tipo === "entrada" ? atual.quantidade + quantidade : Math.max(0, atual.quantidade - quantidade);
      const { error } = await supabase.from("materiais").update({ quantidade: novoSaldo }).eq("id", mov.id);
      if (error) throw error;
      await supabase.from("movimentacoes_material").insert({ material_id: mov.id, tipo: mov.tipo, quantidade });
    },
    onSuccess: () => { toast.success("Estoque atualizado."); setMov(null); void qc.invalidateQueries({ queryKey: ["materiais"] }); },
  });

  return <>
    <div className="rise flex items-end justify-between"><div><p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Estoque</p><h1 className="font-display text-[26px] leading-none mt-1">Materiais</h1></div>{papel === "gestora" ? <button onClick={() => setNovo(!novo)} className="font-mono text-[10px] uppercase tracking-wide text-primary border border-primary/40 rounded-[7px] px-2.5 py-1.5">{novo ? "Fechar" : "Novo item"}</button> : null}</div>
    {novo ? <Panel className="space-y-3"><CampoTexto rotulo="Material" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Bolas de vôlei" /><div className="grid grid-cols-3 gap-2"><CampoTexto rotulo="Unidade" value={form.unidade} onChange={(e) => setForm({ ...form, unidade: e.target.value })} /><CampoTexto rotulo="Quantidade" type="number" value={form.quantidade} onChange={(e) => setForm({ ...form, quantidade: e.target.value })} /><CampoTexto rotulo="Mínimo" type="number" value={form.minimo} onChange={(e) => setForm({ ...form, minimo: e.target.value })} /></div><BotaoPrimario onClick={() => criar.mutate()} disabled={!form.nome}>Cadastrar</BotaoPrimario></Panel> : null}
    {mov ? <Panel className="space-y-3"><CampoSelect rotulo="Movimento" value={mov.tipo} onChange={(e) => setMov({ ...mov, tipo: e.target.value })}><option value="entrada">Entrada</option><option value="saida">Saída</option></CampoSelect><CampoTexto rotulo="Quantidade" type="number" value={mov.quantidade} onChange={(e) => setMov({ ...mov, quantidade: e.target.value })} /><BotaoPrimario onClick={() => movimentar.mutate()} disabled={!mov.quantidade}>Atualizar estoque</BotaoPrimario></Panel> : null}
    {data.length ? <ListaPanel>{data.map((m) => <ListRow key={m.id} titulo={m.nome} subtitulo={`Mínimo: ${m.minimo} ${m.unidade}`} direita={<div className="flex items-center gap-2"><Pill tom={m.quantidade <= m.minimo ? "perigo" : "sucesso"}>{m.quantidade} {m.unidade}</Pill>{papel === "gestora" ? <button onClick={() => setMov({ id: m.id, tipo: "entrada", quantidade: "1" })} className="text-primary text-lg" aria-label={`Movimentar ${m.nome}`}>±</button> : null}</div>} />)}</ListaPanel> : <Vazio texto="Nenhum material cadastrado." />}
  </>;
}
