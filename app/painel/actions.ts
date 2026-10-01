"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { exigirRecrutador } from "@/lib/auth";
import { admin } from "@/lib/supabase/admin";
import { supabaseServidor } from "@/lib/supabase/server";
import { criarConvite, enviarEmailConvite, urlBase } from "@/lib/convite";
import { INSTRUMENTOS, listaInstrumentos, type Instrumento } from "@/lib/instrumentos";

export type EstadoLink = {
  link?: string;
  expira?: string;
  nome?: string;
  emailEnviado?: boolean;
  erro?: string;
} | null;

const texto = (fd: FormData, k: string, max = 200) => String(fd.get(k) ?? "").trim().slice(0, max) || null;
const dias = (fd: FormData) => Math.min(30, Math.max(1, Number(fd.get("dias")) || 7));

async function montarLink(token: string) {
  const h = await headers();
  return `${urlBase(h.get("x-forwarded-host") ?? h.get("host"), h.get("x-forwarded-proto"))}/avaliacao/${token}`;
}

export async function criarCandidato(_: EstadoLink, fd: FormData): Promise<EstadoLink> {
  const user = await exigirRecrutador();
  const nome = texto(fd, "nome");
  if (!nome || nome.length < 3) return { erro: "Informe o nome completo do candidato." };
  const escolhidos = fd.getAll("instrumentos").map(String).filter((k): k is Instrumento => INSTRUMENTOS.includes(k as Instrumento));
  if (!escolhidos.length) return { erro: "Escolha pelo menos um questionário." };
  const instrumentos = listaInstrumentos(escolhidos);
  const email = texto(fd, "email");
  const { data, error } = await admin()
    .from("candidatos")
    .insert({ nome, email, instrumentos, cargo: texto(fd, "cargo"), empresa: texto(fd, "empresa"), cidade: texto(fd, "cidade"), criado_por: user.id })
    .select("id")
    .single();
  if (error || !data) return { erro: "Não foi possível cadastrar. Tente de novo." };
  const { token, expira } = await criarConvite(data.id, dias(fd));
  const link = await montarLink(token);
  const emailEnviado = email && fd.get("enviar") === "on" ? await enviarEmailConvite(email, nome, link, expira, instrumentos) : false;
  revalidatePath("/painel");
  return { link, expira, nome, emailEnviado };
}

export async function gerarNovoLink(_: EstadoLink, fd: FormData): Promise<EstadoLink> {
  await exigirRecrutador();
  const id = String(fd.get("candidato_id") ?? "");
  const { data } = await admin().from("candidatos").select("id, nome, email, concluido_em, instrumentos").eq("id", id).maybeSingle();
  if (!data) return { erro: "Candidato não encontrado." };
  if (data.concluido_em) return { erro: "Este candidato já concluiu a avaliação." };
  const { token, expira } = await criarConvite(data.id, dias(fd));
  const link = await montarLink(token);
  const emailEnviado = data.email && fd.get("enviar") === "on" ? await enviarEmailConvite(data.email, data.nome, link, expira, listaInstrumentos(data.instrumentos)) : false;
  revalidatePath("/painel");
  return { link, expira, nome: data.nome, emailEnviado };
}

export async function excluirCandidato(fd: FormData) {
  await exigirRecrutador();
  const id = String(fd.get("candidato_id") ?? "");
  await admin().from("candidatos").delete().eq("id", id);
  revalidatePath("/painel");
  if (fd.get("voltar")) redirect("/painel");
}

export async function sair() {
  const sb = await supabaseServidor();
  await sb.auth.signOut();
  redirect("/login");
}
