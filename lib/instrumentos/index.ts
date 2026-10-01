import "server-only";
import dados from "./dados.json";

/*
 * Este módulo contém as chaves de correção e os textos de interpretação.
 * O import "server-only" faz o build falhar se algum componente do
 * navegador tentar importá-lo, então nada daqui chega ao candidato.
 */

export type Instrumento = "indicador" | "locus" | "motivograma" | "bases";
export const INSTRUMENTOS: Instrumento[] = ["indicador", "locus", "motivograma", "bases"];
export type Respostas = Partial<Record<Instrumento, (number | null)[]>>;
export const NOME_INSTRUMENTO: Record<Instrumento, string> = {
  indicador: "Indicador Tipológico",
  locus: "Lócus de Controle",
  motivograma: "Motivograma",
  bases: "Bases Motivacionais",
};
export const MINUTOS: Record<Instrumento, number> = { indicador: 10, locus: 10, motivograma: 8, bases: 10 };

/** Normaliza a lista gravada no banco: só valores conhecidos, na ordem padrão. */
export function listaInstrumentos(v: unknown): Instrumento[] {
  const arr = Array.isArray(v) ? v : [];
  const lista = INSTRUMENTOS.filter((k) => arr.includes(k));
  return lista.length ? lista : [...INSTRUMENTOS];
}

// ---------- Dados extraídos dos arquivos originais ----------
type IndQ = [string, string, string, string, string]; // pergunta, opção 1, opção 2, letra 1, letra 2
export const IND = dados.ind as unknown as {
  Q: IndQ[];
  NAMES: Record<string, string>;
  PAIRS: [string, string, string][];
  TYPES: Record<string, [string, string]>;
};
export const LOC = dados.loc as unknown as {
  Q: { a: string; b: string; ci: "A" | "B" }[];
  LEVELS: { min: number | null; max: number | null; range: string; title: string; text: string }[];
};
export type NInfo = {
  resumo: string; L: string; nome: string; nivel: number; ordem: string; herz: string;
  def: string; alto: string; baixo: string; trabalho: string[]; motivar: string[];
  riscos: string[]; encaixe: string; atencao: string; perguntas: string[]; alavancas: string[];
};
export const MOT = dados.mot as unknown as {
  ITEMS: { n: number; q: string; a: { l: string; t: string }; b: { l: string; t: string } }[];
  LETTERS: string[];
  N: Record<string, NInfo>;
};
export const BAS = dados.bas as unknown as {
  S: Record<string, string>;
  Q: [string, string][];
  M: Record<string, { nome: string; cor: string; letra: string; resumo: string; texto: string[] }>;
};

// ---------- Formato das respostas ----------
// indicador: 1 ou 2 (opção escolhida)
// locus: pontos dados à afirmação A (0 a 5; B recebe 5 - A)
// motivograma e bases: pontos dados à alternativa A (0 a 3; B recebe 3 - A)
export const ESPEC: Record<Instrumento, { n: number; min: number; max: number }> = {
  indicador: { n: IND.Q.length, min: 1, max: 2 },
  locus: { n: LOC.Q.length, min: 0, max: 5 },
  motivograma: { n: MOT.ITEMS.length, min: 0, max: 3 },
  bases: { n: BAS.Q.length, min: 0, max: 3 },
};
export const TOTAL_ITENS = INSTRUMENTOS.reduce((s, k) => s + ESPEC[k].n, 0);

export function respostasValidas(inst: Instrumento, arr: unknown): arr is (number | null)[] {
  const e = ESPEC[inst];
  return (
    Array.isArray(arr) &&
    arr.length === e.n &&
    arr.every((v) => v === null || (Number.isInteger(v) && v >= e.min && v <= e.max))
  );
}
export const completo = (arr: (number | null)[]) => arr.every((v) => v !== null);
export const vazio = (inst: Instrumento) => Array<number | null>(ESPEC[inst].n).fill(null);

// ---------- O que o navegador do candidato recebe: só textos ----------
export type Publico = {
  indicador: { pergunta: string; a: string; b: string }[];
  locus: { a: string; b: string }[];
  motivograma: { pergunta: string; a: string; b: string }[];
  bases: { a: string; b: string }[];
};
export function conteudoPublico(lista: Instrumento[]): Partial<Publico> {
  const todos: Publico = {
    indicador: IND.Q.map((q) => ({ pergunta: q[0], a: q[1], b: q[2] })),
    locus: LOC.Q.map((q) => ({ a: q.a, b: q.b })),
    motivograma: MOT.ITEMS.map((it) => ({ pergunta: it.q, a: it.a.t, b: it.b.t })),
    bases: BAS.Q.map(([a, b]) => ({ a: BAS.S[a], b: BAS.S[b] })),
  };
  // Só os textos dos questionários enviados a este candidato
  return Object.fromEntries(lista.map((k) => [k, todos[k]])) as Partial<Publico>;
}

// ---------- Cálculo (mesma lógica dos arquivos originais) ----------
export type Resultado = {
  versao: 1;
  indicador?: { contagens: Record<string, number>; tipo: string };
  locus?: { ci: number; ce: number; indice: number | null; faixa: number };
  motivograma?: {
    totais: Record<string, number>;
    ranking: string[];
    fortes: number;
    moderadas: number;
    equilibrada: boolean;
  };
  bases?: { totais: Record<string, number>; ordem: string[]; diferenca: number; equilibrada: boolean };
};

export function calcular(r: Partial<Record<Instrumento, number[]>>): Resultado {
  const res: Resultado = { versao: 1 };

  if (r.indicador) {
    const c: Record<string, number> = { E: 0, I: 0, S: 0, N: 0, T: 0, F: 0, J: 0, P: 0 };
    r.indicador.forEach((a, i) => { c[IND.Q[i][a + 2]]++; });
    const tipo = IND.PAIRS.map(([a, b]) => (c[a] >= c[b] ? a : b)).join("");
    res.indicador = { contagens: c, tipo };
  }

  if (r.locus) {
    let ci = 0, ce = 0;
    LOC.Q.forEach((q, k) => {
      const a = r.locus![k], b = 5 - a;
      ci += q.ci === "A" ? a : b;
      ce += q.ci === "A" ? b : a;
    });
    const indice = ce === 0 ? null : ci / ce; // null = infinito (nenhum ponto externo)
    const ratio = indice ?? Infinity;
    const faixa = LOC.LEVELS.findIndex((l) => ratio >= (l.min ?? -Infinity) && ratio < (l.max ?? Infinity));
    res.locus = { ci, ce, indice, faixa: faixa === -1 ? LOC.LEVELS.length - 1 : faixa };
  }

  if (r.motivograma) {
    const tot: Record<string, number> = { v: 0, w: 0, x: 0, y: 0, z: 0 };
    let fortes = 0, moderadas = 0;
    MOT.ITEMS.forEach((it, i) => {
      const pa = r.motivograma![i];
      tot[it.a.l] += pa;
      tot[it.b.l] += 3 - pa;
      if (pa === 3 || pa === 0) fortes++; else moderadas++;
    });
    const ranking = [...MOT.LETTERS].sort((a, b) => tot[b] - tot[a] || MOT.N[a].nivel - MOT.N[b].nivel);
    res.motivograma = { totais: tot, ranking, fortes, moderadas, equilibrada: tot[ranking[0]] - tot[ranking[4]] <= 6 };
  }

  if (r.bases) {
    const T: Record<string, number> = { X: 0, Y: 0, Z: 0 };
    BAS.Q.forEach(([a, b], i) => {
      const v = r.bases![i];
      T[a[0]] += v;
      T[b[0]] += 3 - v;
    });
    const ordem = ["Z", "X", "Y"].sort((p, q) => T[q] - T[p]);
    const diferenca = T[ordem[0]] - T[ordem[1]];
    res.bases = { totais: T, ordem, diferenca, equilibrada: diferenca <= 5 };
  }

  return res;
}

export function faixaMotivograma(s: number) {
  if (s >= 27) return "Fortemente insatisfeita";
  if (s >= 21) return "Insatisfeita";
  if (s >= 16) return "Moderada";
  if (s >= 10) return "Pouco ativa";
  return "Satisfeita";
}
