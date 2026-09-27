import { cpfDigitos, cpfValido } from "./atleta-validation";

export type CampoImport =
  | "ignorar" | "id_planilha" | "id_sistema" | "nome" | "rg" | "cpf" | "nascimento" | "status"
  | "posicoes" | "categorias" | "turmas" | "torneios" | "possui_camiseta" | "numero_camiseta"
  | "formulario_respondido" | "formulario_status";

export const CAMPOS: { key: CampoImport; rotulo: string; obrigatorio?: boolean; aliases: string[]; exemplo?: string }[] = [
  { key: "id_planilha", rotulo: "Número da linha na planilha (só referência)", aliases: ["id"], exemplo: "1" },
  { key: "id_sistema", rotulo: "ID da atleta no sistema", aliases: ["id sistema", "id da atleta", "id do sistema"], exemplo: "" },
  { key: "nome", rotulo: "Nome completo", obrigatorio: true, aliases: ["nome completo", "nome", "nome da atleta"], exemplo: "Maria da Silva" },
  { key: "rg", rotulo: "RG", obrigatorio: true, aliases: ["rg"], exemplo: "12.345.678-9" },
  { key: "cpf", rotulo: "CPF", obrigatorio: true, aliases: ["cpf"], exemplo: "000.000.000-00" },
  { key: "nascimento", rotulo: "Data de nascimento", obrigatorio: true, aliases: ["nascimento", "data de nascimento", "data nascimento"], exemplo: "21/11/2005" },
  { key: "status", rotulo: "Status (Ativa/Inativa)", aliases: ["status", "situacao", "situacao cadastral", "status da atleta"], exemplo: "Ativa" },
  { key: "posicoes", rotulo: "Posição", obrigatorio: true, aliases: ["posicao", "posicoes", "posicao esportiva"], exemplo: "Ponta / Oposta" },
  { key: "categorias", rotulo: "Categoria", obrigatorio: true, aliases: ["cat", "categoria", "categorias"], exemplo: "Sub 17 / Adulto" },
  { key: "turmas", rotulo: "Turmas", aliases: ["turma", "turmas", "turma de treinamento"], exemplo: "" },
  { key: "torneios", rotulo: "Torneios", aliases: ["torneio atual", "torneio", "torneios"], exemplo: "" },
  { key: "possui_camiseta", rotulo: "Possui camiseta do time? (Sim/Não)", aliases: ["camiseta jogo", "possui camiseta", "possui camiseta do time"], exemplo: "Sim" },
  { key: "numero_camiseta", rotulo: "Número da camiseta", aliases: ["n camiseta", "no camiseta", "numero camiseta", "numero da camiseta"], exemplo: "10" },
  { key: "formulario_respondido", rotulo: "Formulário médico respondido (coluna preenchida = Sim)", aliases: ["nome completo", "formulario medico preenchido"], exemplo: "" },
  { key: "formulario_status", rotulo: "Status do formulário médico", aliases: ["status do formulario", "status formulario medico"], exemplo: "Pendente" },
];
export const rotuloCampo = (k: CampoImport) => CAMPOS.find(c => c.key === k)?.rotulo ?? "Não importar";

export const norm = (v: unknown) => String(v ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
const colado = (v: unknown) => norm(v).replace(/ /g, "");
const vazio = (v: unknown) => v === null || v === undefined || String(v).trim() === "";

export function autoMapear(cabecalhos: string[]): CampoImport[] {
  const usados = new Set<CampoImport>();
  return cabecalhos.map(h => {
    const n = norm(h);
    const c = CAMPOS.find(c => !usados.has(c.key) && c.aliases.includes(n));
    if (!c) return "ignorar";
    usados.add(c.key); return c.key;
  });
}

export type Problema = { campo: string; tipo: "erro" | "pendente" | "aviso"; motivo: string; acao: string };
export type Situacao = "pronto" | "pendente" | "duplicidade" | "existente" | "erro" | "vazia" | "importada" | "atualizada" | "falhou";
export const SITUACAO_ROTULO: Record<Situacao, string> = {
  pronto: "Pronto para importar", pendente: "Pendente de correção", duplicidade: "Possível duplicidade", existente: "Registro já existente",
  erro: "Registro com erro", vazia: "Linha vazia (ignorada)", importada: "Atleta cadastrada com sucesso", atualizada: "Atleta atualizada com sucesso", falhou: "Não foi salva",
};

export type Dados = { nome?: string; rg?: string; cpf?: string; data_nascimento?: string; status?: "ativa" | "inativa"; posicoes?: string[]; categorias?: string[]; turmas?: string[]; torneios?: string[]; possui_camiseta?: boolean; numero_camiseta?: number | null; formulario_status?: string };
export type Linha = { linha: number; nome: string; idPlanilha: string; identificador: string; dados: Dados; problemas: Problema[]; situacao: Situacao; atletaId?: string | undefined; erroGravacao?: string | undefined };
export type Existente = { id: string; numero: number; nome: string; data_nascimento: string | null; status: string; posicoes: string[]; categorias: string[]; possui_camiseta: boolean; numero_camiseta: number | null; formulario_status: string; deleted_at: string | null; cpf?: string | undefined; rg?: string | undefined; turmas: string[]; torneios: string[] };
export type Contexto = { opcoes: { tipo: string; nome: string }[]; turmas: { id: string; nome: string }[]; torneios: { id: string; nome: string }[]; existentes: Existente[] };

const pad = (n: number) => String(n).padStart(2, "0");
export function lerData(v: unknown): string | null {
  if (v instanceof Date && !isNaN(v.getTime())) { const d = new Date(v.getTime() + 12 * 3600e3); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
  if (typeof v === "number" && v > 1 && v < 80000) { const d = new Date(Date.UTC(1899, 11, 30) + Math.round(v) * 86400e3); return d.toISOString().slice(0, 10); }
  const s = String(v ?? "").trim();
  let m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(s); let y: number, mo: number, da: number;
  if (m) { da = +m[1]!; mo = +m[2]!; y = +m[3]!; } else { m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s); if (!m) return null; y = +m[1]!; mo = +m[2]!; da = +m[3]!; }
  const d = new Date(Date.UTC(y, mo - 1, da));
  if (d.getUTCFullYear() !== y || d.getUTCMonth() !== mo - 1 || d.getUTCDate() !== da || y < 1900) return null;
  const iso = d.toISOString().slice(0, 10);
  return iso <= new Date().toISOString().slice(0, 10) ? iso : null;
}
const POS_ALIAS: Record<string, string> = { oposto: "oposta", levantador: "levantadora", ponteira: "ponta", ponteiro: "ponta", libero: "libero", centro: "central", tecnica: "tecnico" };
function casarOpcao(token: string, opcoes: string[], tipo: string) {
  let t = colado(token); if (tipo === "posicao") t = POS_ALIAS[t] ?? t;
  return opcoes.find(o => colado(o) === t) ?? (tipo === "categoria" ? opcoes.find(o => colado(o) === `master${t}`) : undefined);
}
const dividir = (v: unknown) => String(v ?? "").split(/[/,;+]| e /i).map(x => x.trim()).filter(Boolean);
export const mascararCpf = (cpf: string) => `CPF final ${cpf.slice(-4)}`;

export function analisar(linhasBrutas: { linha: number; celulas: unknown[] }[], mapa: CampoImport[], ctx: Contexto, modo: "novas" | "atualizar"): Linha[] {
  const opc = (tipo: string) => ctx.opcoes.filter(o => o.tipo === tipo).map(o => o.nome);
  const res = linhasBrutas.map(({ linha, celulas }) => {
    const v: Partial<Record<CampoImport, unknown>> = {};
    mapa.forEach((k, i) => { if (k !== "ignorar" && v[k] === undefined) v[k] = celulas[i]; });
    const p: Problema[] = []; const d: Dados = {};
    const idPlanilha = vazio(v.id_planilha) ? "" : String(v.id_planilha).trim();
    const mapeadosComValor = (Object.keys(v) as CampoImport[]).filter(k => k !== "id_planilha" && !vazio(v[k]));
    const base: Linha = { linha, nome: vazio(v.nome) ? "" : String(v.nome).trim(), idPlanilha, identificador: idPlanilha ? `ID na planilha ${idPlanilha}` : "—", dados: d, problemas: p, situacao: "pronto" };
    if (!mapeadosComValor.length) { p.push({ campo: "Linha inteira", tipo: "aviso", motivo: "Esta linha não tem informações para importar.", acao: "Nenhuma ação necessária. Se deveria haver uma atleta aqui, preencha os dados na planilha." }); return { ...base, situacao: "vazia" as Situacao }; }
    const faltou = (campo: string, obrig: boolean) => p.push(obrig
      ? { campo, tipo: "pendente", motivo: `Não foi possível cadastrar esta atleta porque o campo ${campo} está vazio.`, acao: `Preencha ${campo} na planilha e importe de novo.` }
      : { campo, tipo: "aviso", motivo: `O campo ${campo} não foi informado.`, acao: "Opcional. Pode completar depois no cadastro da atleta." });
    if (base.nome) { if (base.nome.length > 40) p.push({ campo: "Nome completo", tipo: "erro", motivo: "O nome tem mais de 40 caracteres.", acao: "Abrevie o nome para até 40 caracteres." }); else d.nome = base.nome.replace(/\s+/g, " "); } else faltou("Nome completo", true);
    if (!vazio(v.rg)) { const rg = String(v.rg).trim(); if (rg.length > 20) p.push({ campo: "RG", tipo: "erro", motivo: "O RG tem mais de 20 caracteres.", acao: "Confira o RG na planilha." }); else d.rg = rg; } else faltou("RG", true);
    if (!vazio(v.cpf)) { let c = cpfDigitos(String(v.cpf)); if (typeof v.cpf === "number" && c.length >= 9 && c.length < 11) c = c.padStart(11, "0"); if (!cpfValido(c)) p.push({ campo: "CPF", tipo: "erro", motivo: "O CPF informado parece estar incorreto.", acao: "Confira os números do CPF e tente novamente." }); else { d.cpf = c; base.identificador = mascararCpf(c); } } else faltou("CPF", true);
    if (!vazio(v.nascimento)) { const iso = lerData(v.nascimento); if (iso) d.data_nascimento = iso; else p.push({ campo: "Data de nascimento", tipo: "erro", motivo: "A data de nascimento está em um formato inválido ou é futura.", acao: "Use o formato DD/MM/AAAA, por exemplo 21/11/2005." }); } else faltou("Data de nascimento", true);
    if (!vazio(v.status)) { const s = norm(v.status); if (s.startsWith("inativ")) d.status = "inativa"; else if (s.startsWith("ativ")) d.status = "ativa"; else p.push({ campo: "Status", tipo: "erro", motivo: `O status "${String(v.status).trim()}" não é reconhecido.`, acao: "Use Ativa ou Inativa." }); }
    for (const [k, tipo, rot] of [["posicoes", "posicao", "Posição"], ["categorias", "categoria", "Categoria"]] as const) {
      if (vazio(v[k])) { faltou(rot, true); continue; }
      const achadas: string[] = [];
      for (const t of dividir(v[k])) { const o = casarOpcao(t, opc(tipo), tipo); if (o) { if (!achadas.includes(o)) achadas.push(o); } else p.push({ campo: rot, tipo: "erro", motivo: `A ${rot.toLowerCase()} "${t}" não foi encontrada no sistema.`, acao: `Corrija na planilha ou cadastre essa ${rot.toLowerCase()} no sistema antes de importar.` }); }
      if (achadas.length) d[k] = achadas;
    }
    for (const [k, lista, rot] of [["turmas", ctx.turmas, "Turma"], ["torneios", ctx.torneios, "Torneio"]] as const) {
      if (vazio(v[k])) continue;
      const ids: string[] = [];
      for (const t of dividir(v[k])) { const e = lista.find(x => colado(x.nome) === colado(t)); if (e) ids.push(e.id); else p.push({ campo: rot, tipo: "aviso", motivo: `${rot} "${t}" não existe no sistema. A atleta será salva sem esse vínculo.`, acao: `Cadastre ${rot === "Turma" ? "a turma" : "o torneio"} primeiro e depois vincule a atleta.` }); }
      d[k] = ids;
    }
    if (!vazio(v.possui_camiseta)) { const s = norm(v.possui_camiseta); if (["sim", "s", "x", "yes"].includes(s)) d.possui_camiseta = true; else if (["nao", "n", "no"].includes(s)) d.possui_camiseta = false; else p.push({ campo: "Possui camiseta", tipo: "erro", motivo: `O valor "${String(v.possui_camiseta).trim()}" não é reconhecido.`, acao: "Use Sim ou Não." }); }
    if (!vazio(v.numero_camiseta) && String(v.numero_camiseta).trim() !== "-") { const s = String(v.numero_camiseta).trim(); if (/^\d{1,3}$/.test(s)) { if (d.possui_camiseta === false) p.push({ campo: "Número da camiseta", tipo: "aviso", motivo: "Há número de camiseta, mas a planilha diz que ela não possui camiseta. O número será ignorado.", acao: "Confira se a atleta possui camiseta." }); else { d.possui_camiseta = true; d.numero_camiseta = Number(s); } } else p.push({ campo: "Número da camiseta", tipo: "erro", motivo: "O número da camiseta deve ter até 3 dígitos.", acao: "Corrija o número na planilha." }); }
    if (!vazio(v.formulario_status)) { const s = norm(v.formulario_status); d.formulario_status = s.startsWith("preench") || s === "sim" ? "preenchido" : s.startsWith("atualiz") ? "atualizacao_necessaria" : "pendente"; }
    else if (!vazio(v.formulario_respondido)) d.formulario_status = "preenchido";
    return base;
  });

  // duplicidades na planilha e no banco
  const porCpf = new Map<string, number>(); const porNome = new Map<string, number>();
  for (const l of res) { if (l.situacao === "vazia") continue; if (l.dados.cpf) porCpf.set(l.dados.cpf, (porCpf.get(l.dados.cpf) ?? 0) + 1); if (l.nome) porNome.set(norm(l.nome), (porNome.get(norm(l.nome)) ?? 0) + 1); }
  const idsMapeados = mapa.includes("id_sistema");
  for (const l of res) {
    if (l.situacao === "vazia") continue;
    const erros = l.problemas.some(x => x.tipo === "erro");
    let match: Existente | undefined; let duvida = false;
    if (l.dados.cpf && (porCpf.get(l.dados.cpf) ?? 0) > 1) { l.problemas.push({ campo: "CPF", tipo: "erro", motivo: "Este CPF aparece em mais de uma linha da planilha.", acao: "Deixe apenas uma linha por atleta." }); }
    if (idsMapeados) {
      const bruto = linhasBrutas.find(b => b.linha === l.linha)!.celulas[mapa.indexOf("id_sistema")];
      if (!vazio(bruto)) { const e = ctx.existentes.find(x => String(x.numero) === String(bruto).trim()); if (e) { match = e; l.identificador = `ID sistema #${e.numero}`; } else l.problemas.push({ campo: "ID da atleta", tipo: "aviso", motivo: "Esse ID não existe no sistema.", acao: "Confira o ID ou deixe em branco para uma atleta nova." }); }
    }
    if (l.dados.cpf) { const e = ctx.existentes.find(x => x.cpf === l.dados.cpf); if (e) { if (match && match.id !== e.id) duvida = true; match = match ?? e; } }
    if (match && l.nome && norm(match.nome) !== norm(l.nome)) l.problemas.push({ campo: "Nome completo", tipo: "aviso", motivo: `No sistema o nome está como "${match.nome}".`, acao: "Confira se é a mesma atleta antes de atualizar." });
    if (match?.deleted_at) { l.problemas.push({ campo: "Cadastro", tipo: "erro", motivo: "Esta atleta está na lixeira do sistema.", acao: "Restaure a atleta na lixeira antes de importar." }); }
    const mesmoNome = !match && l.nome ? ctx.existentes.filter(x => norm(x.nome) === norm(l.nome)) : [];
    if (mesmoNome.length) { duvida = true; l.problemas.push({ campo: "Nome completo", tipo: "aviso", motivo: "Já existe uma atleta com este mesmo nome no sistema.", acao: "Verifique se é a mesma pessoa. Se for, informe o CPF correto para atualizar." }); }
    if (!match && l.nome && (porNome.get(norm(l.nome)) ?? 0) > 1) { duvida = true; l.problemas.push({ campo: "Nome completo", tipo: "aviso", motivo: "Este nome aparece em mais de uma linha da planilha.", acao: "Confira se não é a mesma atleta repetida." }); }
    l.atletaId = match?.id;
    const temErro = erros || l.problemas.some(x => x.tipo === "erro");
    if (temErro) l.situacao = "erro";
    else if (duvida) l.situacao = "duplicidade";
    else if (match) { l.situacao = "existente"; if (modo === "novas") l.problemas.push({ campo: "Cadastro", tipo: "aviso", motivo: "Esta atleta já está cadastrada. Verifique se deseja atualizar os dados.", acao: "Use o modo \"Atualizar atletas existentes\"." }); }
    else if (l.problemas.some(x => x.tipo === "pendente")) l.situacao = "pendente";
    else l.situacao = "pronto";
    if (l.situacao === "existente") l.problemas = l.problemas.filter(x => x.tipo !== "pendente");
  }
  return res;
}

export function montarPayload(l: Linha, ex?: Existente) {
  const d = l.dados;
  const dados = {
    nome: d.nome ?? ex?.nome, data_nascimento: d.data_nascimento ?? ex?.data_nascimento, status: d.status ?? ex?.status ?? "ativa",
    posicoes: d.posicoes ?? ex?.posicoes ?? [], categorias: d.categorias ?? ex?.categorias ?? [],
    possui_camiseta: d.possui_camiseta ?? ex?.possui_camiseta ?? false,
    numero_camiseta: (d.possui_camiseta ?? ex?.possui_camiseta) ? (d.numero_camiseta ?? ex?.numero_camiseta ?? null) : null,
    formulario_status: d.formulario_status ?? ex?.formulario_status ?? "pendente",
  };
  return {
    _id: (ex?.id ?? null) as string, _dados: dados, _rg: d.rg ?? ex?.rg ?? "", _cpf: d.cpf ?? ex?.cpf ?? "",
    _turmas: [...new Set([...(ex?.turmas ?? []), ...(d.turmas ?? [])])], _torneios: [...new Set([...(ex?.torneios ?? []), ...(d.torneios ?? [])])],
  };
}

export function traduzirErro(msg: string) {
  const m = msg.toLowerCase();
  if (m.includes("cpf")) return { campo: "CPF", motivo: "Este CPF já pertence a outra atleta ou é inválido.", acao: "Confira o CPF." };
  if (m.includes("camiseta")) return { campo: "Número da camiseta", motivo: "Este número de camiseta já está com outra atleta ativa.", acao: "Escolha outro número ou deixe em branco." };
  if (m.includes("opcao")) return { campo: "Posição/Categoria", motivo: "A posição ou categoria não está disponível no sistema.", acao: "Confira as opções cadastradas." };
  if (m.includes("lixeira") || m.includes("indisponivel")) return { campo: "Cadastro", motivo: "Esta atleta não está disponível para alteração.", acao: "Verifique se ela está na lixeira." };
  if (m.includes("fetch") || m.includes("network")) return { campo: "Conexão", motivo: "Não foi possível conectar ao sistema.", acao: "Verifique sua internet e tente novamente." };
  return { campo: "—", motivo: "Não foi possível salvar este registro.", acao: "Tente novamente." };
}
