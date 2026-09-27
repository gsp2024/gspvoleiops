import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useAuth } from "@/lib/auth";
import { Protegido } from "@/lib/guard";
import { idade } from "@/lib/atleta-validation";
import { exportarAtletas } from "@/lib/atleta-export";
import { AtletaFormulario } from "@/components/AtletaFormulario";
import { BotaoPrimario, CampoSelect, CampoTexto, ListRow, ListaPanel, Panel, Pill, Vazio } from "@/components/kit";

type Atleta = Tables<"atletas"> & { atletas_privado?: Tables<"atletas_privado"> | null; atleta_turmas?: { turma_id: string }[]; atleta_torneios?: { torneio_id: string }[] };
export const Route = createFileRoute("/atletas")({
  head: () => ({ meta: [{ title: "Atletas — VolleyOps" }, { name: "description", content: "Cadastro e acompanhamento de atletas." }, { property: "og:title", content: "Atletas — VolleyOps" }, { property: "og:description", content: "Cadastro e acompanhamento de atletas." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: () => <Protegido><Atletas /></Protegido>,
});
const empty = { busca: "", status: "", categoria: "", posicao: "", turma: "", torneio: "", idadeMin: "", idadeMax: "", camiseta: "", medico: "" };
async function buscarTodos<T>(query: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += 500) { const { data, error } = await query(from, from + 499); if (error) throw error; rows.push(...(data ?? [])); if (!data || data.length < 500) break; }
  return rows;
}
function Atletas() {
  const { papel, user } = useAuth(); const gestor = papel === "gestora"; const qc = useQueryClient();
  const [f, setF] = useState(empty); const [selecionada, setSelecionada] = useState<string | "nova" | null>(null); const [lixeira, setLixeira] = useState(false);
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ["atletas", papel, user?.id], queryFn: async () => {
    const [atletas, turmas, torneios, opcoes] = await Promise.all([
      buscarTodos<Atleta>((from,to) => supabase.from("atletas").select(gestor ? "*, atletas_privado(*), atleta_turmas(turma_id), atleta_torneios(torneio_id)" : "*, atleta_turmas(turma_id), atleta_torneios(torneio_id)").order("numero").range(from,to) as unknown as PromiseLike<{data: Atleta[] | null; error: {message:string} | null}>),
      buscarTodos<{id:string;nome:string}>((from,to) => supabase.from("turmas").select("id,nome").order("nome").range(from,to)),
      buscarTodos<{id:string;nome:string}>((from,to) => supabase.from("torneios").select("id,nome").order("nome").range(from,to)),
      buscarTodos<{tipo:string;nome:string}>((from,to) => supabase.from("atleta_opcoes").select("tipo,nome").order("nome").range(from,to)),
    ]);
    return { atletas, turmas, torneios, opcoes };
  } });
  const { data: opcoesData } = useQuery({ queryKey: ["atletas-opcoes"], queryFn: async () => { const { data } = await supabase.from("atleta_opcoes").select("tipo,nome").order("nome"); return data ?? []; } });
  const remover = useMutation({ mutationFn: async ({id,restaurar}:{id:string;restaurar?:boolean}) => { const { error } = await supabase.from("atletas").update({ deleted_at: restaurar ? null : new Date().toISOString() }).eq("id",id); if(error) throw error; }, onSuccess: (_,v) => { toast.success(v.restaurar ? "Atleta restaurada." : "Atleta enviada à lixeira por 30 dias."); void qc.invalidateQueries({queryKey:["atletas"]}); }, onError: () => toast.error("Não foi possível concluir a ação. Tente novamente.") });
  const itens = (data?.atletas ?? []).filter(a => {
    if (!!a.deleted_at !== lixeira) return false;
    const age = idade(a.data_nascimento);
    return (!f.busca || a.nome.toLowerCase().includes(f.busca.toLowerCase()) || String(a.numero).includes(f.busca)) &&
      (!f.status || a.status === f.status) && (!f.categoria || a.categorias.includes(f.categoria)) && (!f.posicao || a.posicoes.includes(f.posicao)) &&
      (!f.turma || a.atleta_turmas?.some(x => x.turma_id === f.turma)) && (!f.torneio || a.atleta_torneios?.some(x => x.torneio_id === f.torneio)) &&
      (!f.idadeMin || (age !== null && age >= Number(f.idadeMin))) && (!f.idadeMax || (age !== null && age <= Number(f.idadeMax))) &&
      (!f.camiseta || a.possui_camiseta === (f.camiseta === "sim")) && (!f.medico || (a.formulario_status === "preenchido") === (f.medico === "sim"));
  });
  const atual = data?.atletas.find(a => a.id === selecionada);
  if (selecionada && (selecionada === "nova" || atual)) return <AtletaFormulario key={selecionada} {...(atual ? { atleta: atual } : {})} turmas={data?.turmas ?? []} torneios={data?.torneios ?? []} opcoes={opcoesData ?? data?.opcoes ?? []} fechar={() => setSelecionada(null)} />;
  return <div className="space-y-4">
    <div className="rise flex items-end justify-between gap-2"><div><p className="label-mono">Cadastro</p><h1 className="font-display text-[26px] leading-none mt-1">Atletas</h1></div>{gestor && <button onClick={() => { setLixeira(false); setSelecionada("nova"); }} className="font-mono text-[10px] uppercase tracking-wide text-primary border border-primary/40 rounded-[7px] px-2.5 py-1.5">Nova atleta</button>}</div>
    <Panel className="space-y-3"><CampoTexto rotulo="Buscar por nome ou ID" value={f.busca} onChange={e => setF({...f,busca:e.target.value})} placeholder="Nome ou número" />
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        <CampoSelect rotulo="Status" value={f.status} onChange={e => setF({...f,status:e.target.value})}><option value="">Todos</option><option value="ativa">Ativa</option><option value="inativa">Inativa</option></CampoSelect>
        <CampoSelect rotulo="Categoria" value={f.categoria} onChange={e => setF({...f,categoria:e.target.value})}><option value="">Todas</option>{(opcoesData ?? data?.opcoes ?? []).filter(o => o.tipo === "categoria").map(o => <option key={o.nome}>{o.nome}</option>)}</CampoSelect>
        <CampoSelect rotulo="Posição" value={f.posicao} onChange={e => setF({...f,posicao:e.target.value})}><option value="">Todas</option>{(opcoesData ?? data?.opcoes ?? []).filter(o => o.tipo === "posicao").map(o => <option key={o.nome}>{o.nome}</option>)}</CampoSelect>
        <CampoSelect rotulo="Turma" value={f.turma} onChange={e => setF({...f,turma:e.target.value})}><option value="">Todas</option>{data?.turmas.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}</CampoSelect>
        <CampoSelect rotulo="Torneio" value={f.torneio} onChange={e => setF({...f,torneio:e.target.value})}><option value="">Todos</option>{data?.torneios.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}</CampoSelect>
        <CampoSelect rotulo="Camiseta" value={f.camiseta} onChange={e => setF({...f,camiseta:e.target.value})}><option value="">Todas</option><option value="sim">Sim</option><option value="nao">Não</option></CampoSelect>
        <CampoSelect rotulo="Formulário médico" value={f.medico} onChange={e => setF({...f,medico:e.target.value})}><option value="">Todos</option><option value="sim">Preenchido</option><option value="nao">Não preenchido</option></CampoSelect>
        <CampoTexto rotulo="Idade mínima" type="number" min="0" value={f.idadeMin} onChange={e => setF({...f,idadeMin:e.target.value})} />
        <CampoTexto rotulo="Idade máxima" type="number" min="0" value={f.idadeMax} onChange={e => setF({...f,idadeMax:e.target.value})} />
      </div><button className="text-xs text-muted-foreground" onClick={() => setF(empty)}>Limpar filtros</button>
    </Panel>
    <div className="flex flex-wrap items-center justify-between gap-2"><p className="label-mono">{itens.length} atleta(s)</p><div className="flex flex-wrap gap-2">{gestor && <><button className="text-xs text-primary border border-line rounded-[7px] px-2 py-1.5" onClick={() => setLixeira(!lixeira)}>{lixeira ? "Voltar à lista" : "Lixeira"}</button><button className="text-xs text-primary border border-line rounded-[7px] px-2 py-1.5" onClick={() => void exportarAtletas(itens,"xlsx",data?.turmas ?? [],data?.torneios ?? [])}>Excel</button><button className="text-xs text-primary border border-line rounded-[7px] px-2 py-1.5" onClick={() => void exportarAtletas(itens,"pdf",data?.turmas ?? [],data?.torneios ?? [])}>PDF</button></>}</div></div>
    {isLoading ? <Vazio texto="Carregando atletas..." /> : isError ? <Panel><p className="text-sm">Não foi possível carregar os cadastros. Verifique sua conexão e tente novamente.</p><BotaoPrimario onClick={() => void refetch()}>Tentar novamente</BotaoPrimario></Panel> : itens.length ? <ListaPanel>{itens.map(a => <div key={a.id} className="flex items-center gap-1"><div className="flex-1 min-w-0"><ListRow inicial={a.nome.charAt(0).toUpperCase()} titulo={`#${a.numero} · ${a.nome}`} subtitulo={`${a.categorias.join(", ") || "Sem categoria"} · ${idade(a.data_nascimento) ?? "—"} anos`} direita={<span className="flex gap-1">{(!a.foto_path || (gestor && !a.atletas_privado?.documento_path) || a.formulario_status !== "preenchido") && <span title="Foto, documento ou formulário médico pendente" className="text-warning">!</span>}<Pill tom={a.status === "ativa" ? "sucesso" : "neutro"}>{a.status}</Pill></span>} onClick={() => setSelecionada(a.id)} /></div>{gestor && <div className="pr-2 shrink-0">{lixeira ? <button className="text-xs text-primary" onClick={() => remover.mutate({id:a.id,restaurar:true})}>Restaurar</button> : <div className="flex flex-col gap-1"><button className="text-[10px] text-warning" onClick={() => { if(window.confirm(`Deseja inativar ${a.nome}? O cadastro será mantido.`)) void supabase.from("atletas").update({status:"inativa"}).eq("id",a.id).then(({error}) => { if(error) toast.error("Não foi possível inativar. Tente novamente."); else { toast.success("Atleta inativada."); void qc.invalidateQueries({queryKey:["atletas"]}); } }); }}>Inativar</button><button className="text-[10px] text-danger" onClick={() => { if(window.confirm(`Deseja mesmo deletar ${a.nome}? Ela ficará na lixeira por 30 dias.`)) remover.mutate({id:a.id}); }}>Deletar</button></div>}</div>}</div>)}</ListaPanel> : <Vazio texto={lixeira ? "A lixeira está vazia." : "Nenhuma atleta encontrada. Ajuste os filtros ou cadastre uma nova atleta."} />}
    {lixeira && <p className="text-xs text-muted-foreground">Registros na lixeira podem ser restaurados durante 30 dias. A exclusão definitiva não é automática.</p>}
  </div>;
}
