import "server-only";
import { createHash, randomBytes } from "crypto";
import { admin } from "./supabase/admin";
import { listaInstrumentos, MINUTOS, type Instrumento } from "./instrumentos";

export const gerarToken = () => randomBytes(32).toString("base64url");
export const hashToken = (t: string) => createHash("sha256").update(t).digest("hex");

export type ConviteValido = {
  ok: true;
  conviteId: string;
  candidatoId: string;
  nome: string;
  consentido: boolean;
  instrumentos: Instrumento[];
};
export type ConviteInvalido = { ok: false; motivo: "invalido" | "expirado" | "concluido" };

export const MENSAGENS: Record<ConviteInvalido["motivo"], { titulo: string; texto: string }> = {
  invalido: {
    titulo: "Este link não é válido",
    texto: "Confira se o endereço foi copiado inteiro. Se o problema continuar, peça um novo link a quem enviou o convite.",
  },
  expirado: {
    titulo: "Este link expirou",
    texto: "O prazo para responder terminou ou um novo link foi gerado. Peça um novo link a quem enviou o convite.",
  },
  concluido: {
    titulo: "Avaliação já enviada",
    texto: "As respostas deste link já foram recebidas. Não é preciso fazer mais nada.",
  },
};

export async function carregarConvite(token: string): Promise<ConviteValido | ConviteInvalido> {
  if (!/^[A-Za-z0-9_-]{40,60}$/.test(token)) return { ok: false, motivo: "invalido" };
  const { data } = await admin()
    .from("convites")
    .select("id, candidato_id, expira_em, consentimento_em, concluido_em, revogado, candidatos(nome, concluido_em, instrumentos)")
    .eq("token_hash", hashToken(token))
    .maybeSingle();
  if (!data) return { ok: false, motivo: "invalido" };
  const cand = (Array.isArray(data.candidatos) ? data.candidatos[0] : data.candidatos) as
    | { nome: string; concluido_em: string | null; instrumentos: unknown }
    | null;
  if (data.concluido_em || cand?.concluido_em) return { ok: false, motivo: "concluido" };
  if (data.revogado || new Date(data.expira_em) < new Date()) return { ok: false, motivo: "expirado" };
  return {
    ok: true,
    conviteId: data.id,
    candidatoId: data.candidato_id,
    nome: cand?.nome ?? "",
    consentido: !!data.consentimento_em,
    instrumentos: listaInstrumentos(cand?.instrumentos),
  };
}

/** Cria um novo link e invalida os anteriores ainda não usados. Devolve o token (só existe agora). */
export async function criarConvite(candidatoId: string, dias: number) {
  const db = admin();
  await db.from("convites").update({ revogado: true }).eq("candidato_id", candidatoId).is("concluido_em", null);
  const token = gerarToken();
  const expira = new Date(Date.now() + dias * 86400000).toISOString();
  const { error } = await db
    .from("convites")
    .insert({ candidato_id: candidatoId, token_hash: hashToken(token), expira_em: expira });
  if (error) throw new Error("Não foi possível gerar o link.");
  return { token, expira };
}

export function urlBase(hostHeader?: string | null, proto?: string | null) {
  const env = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (env) return env;
  return `${proto ?? "https"}://${hostHeader ?? "localhost:3000"}`;
}

/** Envio opcional por e-mail via Resend. Retorna true se enviou. */
export async function enviarEmailConvite(para: string, nome: string, link: string, expira: string, instrumentos: Instrumento[]) {
  const chave = process.env.RESEND_API_KEY;
  const de = process.env.EMAIL_REMETENTE;
  if (!chave || !de) return false;
  const prazo = new Date(expira).toLocaleDateString("pt-BR", { day: "2-digit", month: "long" });
  const primeiro = nome.split(/\s+/)[0];
  const n = instrumentos.length;
  const minutos = instrumentos.reduce((t, k) => t + MINUTOS[k], 0);
  const qtd = n === 1 ? "um questionário curto" : `${["", "", "dois", "três", "quatro"][n]} questionários curtos`;
  const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
  const html = `<div style="font-family:Arial,sans-serif;color:#333;max-width:560px;line-height:1.55">
<p>Olá, ${esc(primeiro)}.</p>
<p>Como parte do processo seletivo, pedimos que você responda à avaliação de perfil. São ${qtd}, com cerca de ${minutos} minutos no total. Você pode parar e continuar depois pelo mesmo link.</p>
<p><a href="${link}" style="display:inline-block;background:#1B342E;color:#fff;padding:12px 22px;border-radius:6px;text-decoration:none">Responder à avaliação</a></p>
<p>O link é pessoal, pode ser usado uma única vez e vale até ${prazo}.</p>
<p>RJL Consultoria</p></div>`;
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${chave}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: de, to: [para], subject: "Avaliação de perfil: processo seletivo", html }),
  });
  return r.ok;
}
