import type { Metadata } from "next";
import { admin } from "@/lib/supabase/admin";
import { carregarConvite, MENSAGENS } from "@/lib/convite";
import { INSTRUMENTOS, conteudoPublico, respostasValidas, vazio, type Respostas } from "@/lib/instrumentos";
import Jornada from "./Jornada";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Avaliação de perfil", robots: { index: false, follow: false } };

export default async function Pagina({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const conv = await carregarConvite(token);

  if (!conv.ok) {
    const m = MENSAGENS[conv.motivo];
    return (
      <main className="palco">
        <section className="aviso">
          <h1>{m.titulo}</h1>
          <p>{m.texto}</p>
        </section>
      </main>
    );
  }

  const { data } = await admin().from("respostas").select("instrumento, respostas").eq("candidato_id", conv.candidatoId);
  const iniciais = Object.fromEntries(INSTRUMENTOS.map((k) => [k, vazio(k)])) as Respostas;
  for (const linha of data ?? []) {
    const k = linha.instrumento as keyof Respostas;
    if (INSTRUMENTOS.includes(k) && respostasValidas(k, linha.respostas)) iniciais[k] = linha.respostas;
  }

  return (
    <Jornada
      token={token}
      nome={conv.nome}
      consentido={conv.consentido}
      conteudo={conteudoPublico()}
      respostasIniciais={iniciais}
    />
  );
}
