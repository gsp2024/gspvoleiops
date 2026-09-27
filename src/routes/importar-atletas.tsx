import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Protegido } from "@/lib/guard";
import { BotaoPrimario, CampoSelect, Panel, Pill, Vazio } from "@/components/kit";
import { CAMPOS, SITUACAO_ROTULO, analisar, autoMapear, montarPayload, rotuloCampo, traduzirErro, type CampoImport, type Contexto, type Existente, type Linha, type Situacao } from "@/lib/atleta-import";

export const Route = createFileRoute("/importar-atletas")({
  head: () => ({ meta: [{ title: "Importar atletas via Excel — VolleyOps" }, { name: "description", content: "Importação em massa de atletas a partir de planilhas Excel, com validação e relatório." }, { property: "og:title", content: "Importar atletas via Excel — VolleyOps" }, { property: "og:description", content: "Importação em massa de atletas com validação e relatório." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: () => <Protegido papeis={["gestora"]}><Importar /></Protegido>,
});

type Bruta = { linha: number; celulas: unknown[] };
type Historico = { id: string; arquivo_nome: string; modo: string; created_at: string; totais: Partial<Record<"total"|"cadastradas"|"atualizadas"|"ignoradas"|"erros"|"pendentes"|"duplicidades", number>>; linhas: LinhaRelatorio[] };
type LinhaRelatorio = { linha: number; nome: string; identificador: string; situacao: string; campo: string; motivo: string; acao: string };
const TOM: Record<Situacao, "sucesso" | "alerta" | "perigo" | "neutro"> = { pronto: "sucesso", importada: "sucesso", atualizada: "sucesso", existente: "neutro", vazia: "neutro", pendente: "alerta", duplicidade: "alerta", erro: "perigo", falhou: "perigo" };
const baixar = (blob: Blob, nome: string) => { const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = nome; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); };
async function planilha(linhas: Record<string, unknown>[], nome: string) {
  const XLSX = await import("xlsx"); const b = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(b, XLSX.utils.json_to_sheet(linhas), "Relatório");
  baixar(new Blob([XLSX.write(b, { bookType: "xlsx", type: "array" })]), nome);
}
const paraRelatorio = (l: Linha): LinhaRelatorio => {
  const principal = l.erroGravacao ? null : l.problemas.find(p => p.tipo === "erro") ?? l.problemas.find(p => p.tipo === "pendente") ?? l.problemas[0];
  const g = l.erroGravacao ? traduzirErro(l.erroGravacao) : null;
  return { linha: l.linha, nome: l.nome || "(sem nome)", identificador: l.identificador, situacao: SITUACAO_ROTULO[l.situacao],
    campo: g?.campo ?? principal?.campo ?? "", motivo: g?.motivo ?? (l.situacao === "importada" ? "Atleta cadastrada com sucesso." : l.situacao === "atualizada" ? "Atleta atualizada com sucesso." : l.problemas.filter(p => p.tipo !== "aviso" || l.situacao !== "pronto").map(p => p.motivo).join(" ") || principal?.motivo || ""),
    acao: g?.acao ?? principal?.acao ?? "" };
};
const excelLinhas = (ls: LinhaRelatorio[]) => ls.map(l => ({ "Linha no Excel": l.linha, "Nome da atleta": l.nome, "Identificador": l.identificador, "Situação": l.situacao, "Campo com problema": l.campo, "Motivo": l.motivo, "Ação necessária": l.acao }));

async function carregarContexto(): Promise<Contexto> {
  const todos = async <T,>(q: (a: number, b: number) => PromiseLike<{ data: T[] | null; error: unknown }>) => { const r: T[] = []; for (let i = 0; ; i += 500) { const { data, error } = await q(i, i + 499); if (error) throw error; r.push(...(data ?? [])); if (!data || data.length < 500) break; } return r; };
  type A = Omit<Existente, "cpf" | "rg" | "turmas" | "torneios"> & { atletas_privado: { cpf: string; rg: string } | null; atleta_turmas: { turma_id: string }[]; atleta_torneios: { torneio_id: string }[] };
  const [atletas, opcoes, turmas, torneios] = await Promise.all([
    todos<A>((a, b) => supabase.from("atletas").select("id,numero,nome,data_nascimento,status,posicoes,categorias,possui_camiseta,numero_camiseta,formulario_status,deleted_at,atletas_privado(cpf,rg),atleta_turmas(turma_id),atleta_torneios(torneio_id)").order("numero").range(a, b) as unknown as PromiseLike<{ data: A[] | null; error: unknown }>),
    todos<{ tipo: string; nome: string }>((a, b) => supabase.from("atleta_opcoes").select("tipo,nome").range(a, b)),
    todos<{ id: string; nome: string }>((a, b) => supabase.from("turmas").select("id,nome").range(a, b)),
    todos<{ id: string; nome: string }>((a, b) => supabase.from("torneios").select("id,nome").range(a, b)),
  ]);
  return { opcoes, turmas, torneios, existentes: atletas.map(({ atletas_privado, atleta_turmas, atleta_torneios, ...a }) => ({ ...a, cpf: atletas_privado?.cpf, rg: atletas_privado?.rg, turmas: atleta_turmas.map(x => x.turma_id), torneios: atleta_torneios.map(x => x.torneio_id) })) };
}

function Importar() {
  const { user } = useAuth(); const qc = useQueryClient();
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [cabecalhos, setCabecalhos] = useState<string[]>([]); const [brutas, setBrutas] = useState<Bruta[]>([]); const [mapa, setMapa] = useState<CampoImport[]>([]);
  const [modo, setModo] = useState<"novas" | "atualizar">("novas");
  const [linhas, setLinhas] = useState<Linha[] | null>(null); const [ctx, setCtx] = useState<Contexto | null>(null);
  const [filtro, setFiltro] = useState<string>(""); const [aberta, setAberta] = useState<number | null>(null);
  const [ocupado, setOcupado] = useState<string>(""); const [relatorio, setRelatorio] = useState<{ nome: string; data: string; linhas: Linha[] } | null>(null);
  const [histAberto, setHistAberto] = useState<string | null>(null);
  const hist = useQuery({ queryKey: ["importacoes"], queryFn: async () => { const { data, error } = await supabase.from("importacoes_atletas").select("*").order("created_at", { ascending: false }).limit(30); if (error) throw error; return (data ?? []) as unknown as Historico[]; } });

  const escolher = async (f: File | undefined) => {
    setLinhas(null); setRelatorio(null); setCabecalhos([]); setBrutas([]);
    if (!f) return setArquivo(null);
    if (!/\.(xlsx|xls)$/i.test(f.name)) { toast.error("Este arquivo não é compatível. Envie uma planilha Excel (.xlsx ou .xls)."); return setArquivo(null); }
    if (f.size > 10 * 1024 * 1024) { toast.error("O arquivo é maior que 10 MB. Remova abas ou colunas desnecessárias e tente de novo."); return setArquivo(null); }
    try {
      const XLSX = await import("xlsx"); const wb = XLSX.read(await f.arrayBuffer(), { cellDates: true });
      const ws = wb.Sheets[wb.SheetNames[0]!]!;
      const todas = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, blankrows: true, defval: null, raw: true });
      const inicio = XLSX.utils.decode_range(ws["!ref"] ?? "A1").s.r;
      const idx = todas.findIndex(r => r.filter(c => c !== null && String(c).trim()).length >= 2);
      if (idx < 0) { toast.error("Não encontramos dados nesta planilha. Confira se a primeira aba tem os cabeçalhos e as atletas."); return setArquivo(null); }
      const cab = (todas[idx] ?? []).map((c, i) => (c === null || String(c).trim() === "" ? `Coluna ${i + 1}` : String(c).trim()));
      const rows: Bruta[] = [];
      todas.forEach((r, i) => { if (i > idx && r.some(c => c !== null && String(c).trim() !== "")) rows.push({ linha: inicio + i + 1, celulas: r }); });
      setArquivo(f); setCabecalhos(cab); setBrutas(rows); setMapa(autoMapear(cab));
      toast.success(`Planilha lida: ${rows.length} linha(s) encontradas. Confira as colunas e clique em Analisar.`);
    } catch { toast.error("Não conseguimos ler este arquivo. Confira se ele abre normalmente no Excel e tente novamente."); setArquivo(null); }
  };

  const analisarArquivo = async () => {
    const faltando = CAMPOS.filter(c => c.obrigatorio && !mapa.includes(c.key)).map(c => c.rotulo);
    if (faltando.length && !window.confirm(`Estas informações obrigatórias não estão ligadas a nenhuma coluna: ${faltando.join(", ")}. As atletas sem elas ficarão pendentes. Deseja analisar mesmo assim?`)) return;
    setOcupado("Analisando a planilha…");
    try { const c = await carregarContexto(); setCtx(c); setLinhas(analisar(brutas, mapa, c, modo)); setFiltro(""); setRelatorio(null); }
    catch { toast.error("Não foi possível conectar ao sistema. Verifique sua conexão com a internet e tente novamente."); }
    finally { setOcupado(""); }
  };

  const elegivel = (l: Linha) => (modo === "novas" ? l.situacao === "pronto" : l.situacao === "existente") || l.situacao === "falhou";
  const gravar = async (apenasFalhas = false) => {
    if (!linhas || !ctx || !arquivo) return undefined;
    const alvo = linhas.filter(l => apenasFalhas ? l.situacao === "falhou" : elegivel(l));
    if (!alvo.length) { toast.error(modo === "novas" ? "Nenhuma atleta pronta para cadastrar." : "Nenhuma atleta existente encontrada para atualizar."); return undefined; }
    if (!window.confirm(`${modo === "novas" ? "Cadastrar" : "Atualizar"} ${alvo.length} atleta(s) agora? Campos vazios na planilha não apagam dados já cadastrados.`)) return undefined;
    const novo = [...linhas];
    for (let i = 0; i < alvo.length; i++) {
      const l = alvo[i]!; setOcupado(`Salvando ${i + 1} de ${alvo.length}…`);
      const ex = l.atletaId ? ctx.existentes.find(e => e.id === l.atletaId) : undefined;
      const { data, error } = await supabase.rpc("salvar_cadastro_atleta", montarPayload(l, ex));
      const pos = novo.findIndex(x => x.linha === l.linha);
      novo[pos] = error || !data ? { ...l, situacao: "falhou", erroGravacao: error?.message ?? "sem confirmação" } : { ...l, situacao: ex ? "atualizada" : "importada", atletaId: data, erroGravacao: undefined };
    }
    setLinhas(novo); setOcupado("");
    const data = new Date().toISOString(); setRelatorio({ nome: arquivo.name, data, linhas: novo });
    const conta = (s: Situacao) => novo.filter(l => l.situacao === s).length;
    const totais = { total: novo.length, cadastradas: conta("importada"), atualizadas: conta("atualizada"), ignoradas: conta("vazia") + conta("existente") * (modo === "novas" ? 1 : 0) + conta("pronto") * (modo === "atualizar" ? 1 : 0), erros: conta("erro") + conta("falhou"), pendentes: conta("pendente"), duplicidades: conta("duplicidade") };
    const { error } = await supabase.from("importacoes_atletas").insert({ arquivo_nome: arquivo.name.slice(0, 200), modo, criado_por: user!.id, totais, linhas: novo.map(paraRelatorio) });
    if (error) toast.error("A importação foi feita, mas não conseguimos guardar o histórico dela.");
    void qc.invalidateQueries({ queryKey: ["atletas"] }); void qc.invalidateQueries({ queryKey: ["importacoes"] });
    toast.success(`${totais.cadastradas} cadastrada(s), ${totais.atualizadas} atualizada(s), ${conta("falhou")} não salva(s).`);
    try { setCtx(await carregarContexto()); } catch { /* segue com o contexto anterior */ }
    return undefined;
  };

  const conta = (s: Situacao) => linhas?.filter(l => l.situacao === s).length ?? 0;
  const ausentes = linhas?.filter(l => l.problemas.some(p => p.tipo !== "erro" && /não foi informado|está vazio/.test(p.motivo))).length ?? 0;
  const visiveis = (linhas ?? []).filter(l => !filtro || l.situacao === filtro);
  const colunasIgnoradas = cabecalhos.filter((_, i) => mapa[i] === "ignorar");

  return <div className="space-y-4">
    <div className="rise"><Link to="/atletas" className="text-xs text-muted-foreground">← Atletas</Link><p className="label-mono mt-2">Área administrativa</p><h1 className="font-display text-[26px] leading-none mt-1">Importar atletas via Excel</h1></div>

    <Panel className="space-y-2 text-[13px]">
      <p className="font-semibold">Como funciona</p>
      <ol className="list-decimal pl-5 space-y-1 text-muted-foreground">
        <li>Selecione a planilha (formatos aceitos: <b>.xlsx</b> e <b>.xls</b>). A primeira aba será lida.</li>
        <li>Confira a ligação de cada coluna com o cadastro e ajuste se precisar.</li>
        <li>Escolha o modo e clique em <b>Analisar arquivo</b>. Nada é salvo nesta etapa.</li>
        <li>Revise a pré-visualização e confirme a importação.</li>
      </ol>
      <p className="text-xs text-muted-foreground">Respostas médicas, telefones e contatos da planilha não são importados, porque o cadastro não guarda essas informações. Uma coluna do formulário preenchida marca apenas o formulário médico como "Preenchido".</p>
      <button className="text-xs text-primary border border-line rounded-[7px] px-2 py-1.5" onClick={() => void planilha([Object.fromEntries(CAMPOS.filter(c => c.key !== "id_planilha" && c.key !== "formulario_respondido").map(c => [c.rotulo, c.exemplo ?? ""]))], "modelo-importacao-atletas.xlsx")}>Baixar modelo de planilha</button>
    </Panel>

    <Panel className="space-y-3">
      <label className="block"><span className="label-mono">Arquivo Excel</span>
        <input type="file" accept=".xlsx,.xls" onChange={e => void escolher(e.target.files?.[0])} className="mt-1 block w-full text-[13px] file:mr-3 file:rounded-[7px] file:border file:border-line file:bg-surface-2 file:px-3 file:py-2 file:text-foreground" /></label>
      {arquivo && <p className="text-xs text-muted-foreground">{arquivo.name} · {brutas.length} linha(s) com conteúdo · {cabecalhos.length} coluna(s)</p>}
      {cabecalhos.length > 0 && <>
        <p className="label-mono">Ligação das colunas</p>
        <div className="grid sm:grid-cols-2 gap-2">
          {cabecalhos.map((h, i) => <CampoSelect key={i} rotulo={h.length > 45 ? `${h.slice(0, 45)}…` : h} value={mapa[i]} onChange={e => { const m = [...mapa]; const k = e.target.value as CampoImport; m.forEach((x, j) => { if (x === k && j !== i && k !== "ignorar") m[j] = "ignorar"; }); m[i] = k; setMapa(m); setLinhas(null); }}>
            <option value="ignorar">Não importar</option>{CAMPOS.map(c => <option key={c.key} value={c.key}>{c.rotulo}{c.obrigatorio ? " *" : ""}</option>)}
          </CampoSelect>)}
        </div>
        {colunasIgnoradas.length > 0 && <p className="text-xs text-muted-foreground">Colunas que não serão importadas por não existirem no cadastro: {colunasIgnoradas.map(c => c.slice(0, 30)).join(" · ")}</p>}
        <CampoSelect rotulo="Modo de importação" value={modo} onChange={e => { setModo(e.target.value as "novas" | "atualizar"); setLinhas(null); }}>
          <option value="novas">Cadastrar novas atletas</option><option value="atualizar">Atualizar atletas existentes (por CPF ou ID do sistema)</option>
        </CampoSelect>
        <BotaoPrimario onClick={() => void analisarArquivo()} disabled={!!ocupado}>{ocupado || "Analisar arquivo"}</BotaoPrimario>
      </>}
    </Panel>

    {linhas && <Panel className="space-y-3">
      <p className="label-mono">Pré-visualização</p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[12px]">
        {[["Registros", linhas.length], ["Prontos", conta("pronto")], ["Com erro", conta("erro")], ["Pendentes", conta("pendente")], ["Informação ausente", ausentes], ["Possível duplicidade", conta("duplicidade")], ["Atletas novas", conta("pronto") + conta("pendente")], ["Já existentes", conta("existente")]].map(([r, n]) => <div key={r} className="rounded-[8px] border border-line p-2"><p className="text-muted-foreground">{r}</p><p className="font-display text-[20px]">{n}</p></div>)}
      </div>
      <CampoSelect rotulo="Mostrar" value={filtro} onChange={e => setFiltro(e.target.value)}><option value="">Todos os registros</option>{(Object.keys(SITUACAO_ROTULO) as Situacao[]).filter(s => conta(s)).map(s => <option key={s} value={s}>{SITUACAO_ROTULO[s]} ({conta(s)})</option>)}</CampoSelect>
      <div className="divide-y divide-line border border-line rounded-[8px] max-h-[480px] overflow-auto">
        {visiveis.length ? visiveis.map(l => <div key={l.linha} className="p-2.5 text-[12px]">
          <button className="w-full flex items-center justify-between gap-2 text-left" onClick={() => setAberta(aberta === l.linha ? null : l.linha)}>
            <span className="min-w-0 truncate"><span className="font-mono text-muted-foreground">L{l.linha}</span> · {l.nome || "(sem nome)"}</span><Pill tom={TOM[l.situacao]}>{SITUACAO_ROTULO[l.situacao]}</Pill>
          </button>
          {aberta === l.linha && <ul className="mt-2 space-y-1 text-muted-foreground">
            <li>Identificador: {l.identificador}</li>
            {l.erroGravacao && (() => { const g = traduzirErro(l.erroGravacao); return <li className="text-danger">{g.motivo} {g.acao}</li>; })()}
            {l.problemas.map((p, i) => <li key={i} className={p.tipo === "erro" ? "text-danger" : p.tipo === "pendente" ? "text-warning" : ""}><b>{p.campo}:</b> {p.motivo} {p.acao}</li>)}
            {!l.problemas.length && !l.erroGravacao && <li>Tudo certo com esta linha.</li>}
          </ul>}
        </div>) : <p className="p-3 text-xs text-muted-foreground">Nenhum registro nesta situação.</p>}
      </div>
      <BotaoPrimario onClick={() => void gravar()} disabled={!!ocupado}>{ocupado || (modo === "novas" ? `Confirmar cadastro de ${conta("pronto")} atleta(s)` : `Confirmar atualização de ${conta("existente")} atleta(s)`)}</BotaoPrimario>
      {conta("falhou") > 0 && <button className="text-xs text-primary border border-line rounded-[7px] px-2 py-1.5" disabled={!!ocupado} onClick={() => void gravar(true)}>Tentar novamente só as que falharam ({conta("falhou")})</button>}
      <p className="text-xs text-muted-foreground">Linhas pendentes, com erro ou possível duplicidade não são salvas. Corrija na planilha e envie de novo: atletas já importadas serão reconhecidas pelo CPF e não serão duplicadas.</p>
    </Panel>}

    {relatorio && <Panel className="space-y-2 text-[13px]">
      <p className="label-mono">Relatório da importação</p>
      <p>{relatorio.nome} · {new Date(relatorio.data).toLocaleString("pt-BR")}</p>
      <Resumo linhas={relatorio.linhas} modo={modo} />
      <div className="flex flex-wrap gap-2">
        <button className="text-xs text-primary border border-line rounded-[7px] px-2 py-1.5" onClick={() => void planilha(excelLinhas(relatorio.linhas.map(paraRelatorio)), "relatorio-importacao.xlsx")}>Baixar relatório completo</button>
        <button className="text-xs text-primary border border-line rounded-[7px] px-2 py-1.5" onClick={() => void planilha(excelLinhas(relatorio.linhas.filter(l => ["importada", "atualizada"].includes(l.situacao)).map(paraRelatorio)), "atletas-importadas.xlsx")}>Baixar importadas</button>
        <button className="text-xs text-primary border border-line rounded-[7px] px-2 py-1.5" onClick={() => void planilha(excelLinhas(relatorio.linhas.filter(l => ["erro", "falhou", "pendente", "duplicidade"].includes(l.situacao)).map(paraRelatorio)), "registros-com-problema.xlsx")}>Baixar registros com problema</button>
      </div>
    </Panel>}

    <Panel className="space-y-2">
      <p className="label-mono">Importações anteriores</p>
      {hist.isLoading ? <Vazio texto="Carregando histórico…" /> : !hist.data?.length ? <p className="text-xs text-muted-foreground">Nenhuma importação feita ainda.</p> : hist.data.map(h => <div key={h.id} className="border border-line rounded-[8px] p-2 text-[12px]">
        <button className="w-full text-left flex justify-between gap-2" onClick={() => setHistAberto(histAberto === h.id ? null : h.id)}><span className="truncate">{h.arquivo_nome}</span><span className="text-muted-foreground shrink-0">{new Date(h.created_at).toLocaleString("pt-BR")}</span></button>
        {histAberto === h.id && <div className="mt-2 space-y-2 text-muted-foreground">
          <p>Modo: {h.modo === "novas" ? "Cadastrar novas" : "Atualizar existentes"} · Total {h.totais.total ?? 0} · Cadastradas {h.totais.cadastradas ?? 0} · Atualizadas {h.totais.atualizadas ?? 0} · Ignoradas {h.totais.ignoradas ?? 0} · Erros {h.totais.erros ?? 0} · Pendentes {h.totais.pendentes ?? 0} · Duplicidades {h.totais.duplicidades ?? 0}</p>
          <button className="text-xs text-primary border border-line rounded-[7px] px-2 py-1.5" onClick={() => void planilha(excelLinhas(h.linhas), `relatorio-${h.created_at.slice(0, 10)}.xlsx`)}>Baixar relatório</button>
        </div>}
      </div>)}
    </Panel>
  </div>;
}

function Resumo({ linhas, modo }: { linhas: Linha[]; modo: string }) {
  const c = (s: Situacao) => linhas.filter(l => l.situacao === s).length;
  const itens: [string, number][] = [["Registros analisados", linhas.length], ["Cadastradas com sucesso", c("importada")], ["Atualizadas", c("atualizada")], ["Ignoradas", c("vazia") + (modo === "novas" ? c("existente") : c("pronto"))], ["Com erro", c("erro") + c("falhou")], ["Pendentes", c("pendente")], ["Possíveis duplicidades", c("duplicidade")]];
  return <ul className="grid grid-cols-2 gap-1 text-[12px]">{itens.map(([r, n]) => <li key={r}>{r}: <b>{n}</b></li>)}</ul>;
}
