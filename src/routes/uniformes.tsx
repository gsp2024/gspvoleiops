import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Protegido } from "@/lib/guard";
import { brl } from "@/lib/format";
import { BotaoPrimario, CampoSelect, CampoTexto, ListRow, ListaPanel, Panel, Pill, Vazio } from "@/components/kit";

export const Route = createFileRoute("/uniformes")({
  head: () => ({ meta: [
    { title: "Uniformes — VolleyOps" },
    { name: "description", content: "Pedidos de uniforme por atleta, tamanho e situação de entrega." },
    { property: "og:title", content: "Uniformes — VolleyOps" },
    { property: "og:description", content: "Acompanhe pedidos e entregas de uniformes." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: () => <Protegido><Uniformes /></Protegido>,
});

function Uniformes() {
  const { papel, user } = useAuth();
  const qc = useQueryClient();
  const [novo, setNovo] = useState(false);
  const [form, setForm] = useState({ atleta_id: user?.id ?? "", item: "Camisa oficial", tamanho: "M", quantidade: "1", valor: "0" });
  const { data } = useQuery({
    queryKey: ["uniformes", user?.id, papel],
    queryFn: async () => {
      const [pedidos, perfis, papeis] = await Promise.all([
        supabase.from("pedidos_uniforme").select("*").order("created_at", { ascending: false }),
        papel === "gestora" ? supabase.from("profiles").select("id, nome") : Promise.resolve({ data: [] }),
        papel === "gestora" ? supabase.from("user_roles").select("user_id, role") : Promise.resolve({ data: [] }),
      ]);
      return { pedidos: pedidos.data ?? [], perfis: perfis.data ?? [], papeis: papeis.data ?? [] };
    }, enabled: !!user,
  });
  const criar = useMutation({
    mutationFn: async () => {
      const atletaId = papel === "gestora" ? form.atleta_id : user?.id;
      if (!atletaId) throw new Error("Atleta não identificado");
      const { error } = await supabase.from("pedidos_uniforme").insert({ atleta_id: atletaId, item: form.item, tamanho: form.tamanho, quantidade: Number(form.quantidade), valor: Number(form.valor) });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Pedido registrado."); setNovo(false); void qc.invalidateQueries({ queryKey: ["uniformes"] }); },
    onError: () => toast.error("Não foi possível registrar o pedido."),
  });
  const atualizar = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => { const { error } = await supabase.from("pedidos_uniforme").update({ status }).eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("Situação atualizada."); void qc.invalidateQueries({ queryKey: ["uniformes"] }); },
  });
  const atletas = (data?.papeis ?? []).filter((r) => r.role === "atleta");
  const nomeDe = (id: string) => data?.perfis.find((p) => p.id === id)?.nome || "Meu pedido";
  const tom = (status: string) => status === "entregue" ? "sucesso" : status === "pronto" ? "alerta" : "neutro";

  return <>
    <div className="rise flex items-end justify-between"><div><p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Equipe</p><h1 className="font-display text-[26px] leading-none mt-1">Uniformes</h1></div><button onClick={() => setNovo(!novo)} className="font-mono text-[10px] uppercase tracking-wide text-primary border border-primary/40 rounded-[7px] px-2.5 py-1.5">{novo ? "Fechar" : "Novo pedido"}</button></div>
    {novo ? <Panel className="space-y-3">{papel === "gestora" ? <CampoSelect rotulo="Atleta" value={form.atleta_id} onChange={(e) => setForm({ ...form, atleta_id: e.target.value })}><option value="">Escolher atleta…</option>{atletas.map((a) => <option key={a.user_id} value={a.user_id}>{nomeDe(a.user_id)}</option>)}</CampoSelect> : null}<CampoTexto rotulo="Item" value={form.item} onChange={(e) => setForm({ ...form, item: e.target.value })} /><div className="grid grid-cols-3 gap-2"><CampoSelect rotulo="Tamanho" value={form.tamanho} onChange={(e) => setForm({ ...form, tamanho: e.target.value })}>{["PP", "P", "M", "G", "GG"].map((t) => <option key={t}>{t}</option>)}</CampoSelect><CampoTexto rotulo="Qtd." type="number" value={form.quantidade} onChange={(e) => setForm({ ...form, quantidade: e.target.value })} /><CampoTexto rotulo="Valor" type="number" value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} /></div><BotaoPrimario onClick={() => criar.mutate()} disabled={!form.item || (papel === "gestora" && !form.atleta_id)}>Registrar pedido</BotaoPrimario></Panel> : null}
    {data?.pedidos.length ? <ListaPanel>{data.pedidos.map((p) => <ListRow key={p.id} titulo={papel === "gestora" ? `${nomeDe(p.atleta_id)} · ${p.item}` : p.item} subtitulo={`Tam. ${p.tamanho || "—"} · ${p.quantidade} un · ${brl(p.valor)}`} direita={papel === "gestora" ? <CampoSelect rotulo="" value={p.status} onChange={(e) => atualizar.mutate({ id: p.id, status: e.target.value })}><option value="solicitado">Solicitado</option><option value="produção">Produção</option><option value="pronto">Pronto</option><option value="entregue">Entregue</option></CampoSelect> : <Pill tom={tom(p.status)}>{p.status}</Pill>} />)}</ListaPanel> : <Vazio texto="Nenhum pedido de uniforme registrado." />}
  </>;
}
