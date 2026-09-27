import { z } from "zod";

export const cpfDigitos = (value: string) => value.replace(/\D/g, "").slice(0, 11);
export const mascaraCpf = (value: string) => cpfDigitos(value).replace(/^(\d{3})(\d)/, "$1.$2").replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3").replace(/(\d{3})(\d{1,2})$/, "$1-$2");
export function cpfValido(value: string) {
  const v = cpfDigitos(value);
  if (v.length !== 11 || /^(\d)\1{10}$/.test(v)) return false;
  for (let length = 9; length <= 10; length++) {
    const sum = [...v.slice(0, length)].reduce((acc, digit, i) => acc + Number(digit) * (length + 1 - i), 0);
    const check = (sum * 10) % 11;
    if (Number(v[length]) !== (check === 10 ? 0 : check)) return false;
  }
  return true;
}
export function dataISO(value: string) {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  if (!m) return null;
  const iso = `${m[3]}-${m[2]}-${m[1]}`;
  const d = new Date(`${iso}T12:00:00Z`);
  return d.getUTCFullYear() === Number(m[3]) && d.getUTCMonth() + 1 === Number(m[2]) && d.getUTCDate() === Number(m[1]) && iso <= new Date().toISOString().slice(0, 10) ? iso : null;
}
export const dataTela = (iso: string | null) => iso ? iso.slice(0, 10).split("-").reverse().join("/") : "";
export function idade(iso: string | null, hoje = new Date()) {
  if (!iso) return null;
  const [ano = 0, mes = 0, dia = 0] = iso.split("-").map(Number);
  return hoje.getFullYear() - ano - (hoje.getMonth() + 1 < mes || (hoje.getMonth() + 1 === mes && hoje.getDate() < dia) ? 1 : 0);
}
export const atletaSchema = z.object({
  nome: z.string().trim().min(1, "Por favor, preencha o nome para continuar.").max(40, "O nome pode ter até 40 caracteres."),
  rg: z.string().trim().min(1, "Por favor, preencha o RG para continuar.").max(20, "O RG pode ter até 20 caracteres."),
  cpf: z.string().refine(cpfValido, "O CPF informado parece estar incorreto. Confira os números e tente novamente."),
  nascimento: z.string().refine(v => dataISO(v) !== null, "Confira a data de nascimento no formato DD/MM/AAAA. Não pode ser futura."),
  posicoes: z.array(z.string()).min(1, "Selecione pelo menos uma posição."),
  categorias: z.array(z.string()).min(1, "Selecione pelo menos uma categoria."),
  numero: z.string().refine(v => !v || /^\d{1,3}$/.test(v), "Confira o número da camiseta (até 3 dígitos)."),
});
