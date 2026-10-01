import { NextResponse } from "next/server";
import { admin } from "@/lib/supabase/admin";
import { carregarConvite, MENSAGENS } from "@/lib/convite";
import { type Instrumento, respostasValidas, completo, calcular } from "@/lib/instrumentos";

export const dynamic = "force-dynamic";

const erro = (mensagem: string, status: number) => NextResponse.json({ erro: mensagem }, { status });

export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const conv = await carregarConvite(token);
  if (!conv.ok) return erro(MENSAGENS[conv.motivo].titulo, 410);

  const corpo = await req.json().catch(() => null);
  const db = admin();
  const agora = new Date().toISOString();

  switch (corpo?.acao) {
    case "consentir": {
      await db.from("convites").update({ consentimento_em: agora }).eq("id", conv.conviteId).is("consentimento_em", null);
      await db.from("candidatos").update({ iniciado_em: agora }).eq("id", conv.candidatoId).is("iniciado_em", null);
      return NextResponse.json({ ok: true });
    }

    case "salvar": {
      if (!conv.consentido) return erro("Aceite o termo antes de responder.", 400);
      const inst = corpo.instrumento as Instrumento;
      if (!conv.instrumentos.includes(inst) || !respostasValidas(inst, corpo.respostas))
        return erro("Respostas em formato inválido.", 400);
      const { error } = await db.from("respostas").upsert({
        candidato_id: conv.candidatoId, instrumento: inst, respostas: corpo.respostas, atualizado_em: agora,
      });
      if (error) return erro("Não foi possível salvar.", 500);
      return NextResponse.json({ ok: true });
    }

    case "concluir": {
      if (!conv.consentido) return erro("Aceite o termo antes de responder.", 400);
      const { data } = await db.from("respostas").select("instrumento, respostas").eq("candidato_id", conv.candidatoId);
      const mapa = Object.fromEntries((data ?? []).map((l) => [l.instrumento, l.respostas]));
      for (const inst of conv.instrumentos) {
        if (!respostasValidas(inst, mapa[inst]) || !completo(mapa[inst]))
          return erro("Ainda há perguntas sem resposta.", 400);
      }
      const selecionadas = Object.fromEntries(conv.instrumentos.map((k) => [k, mapa[k]]));
      const resultado = calcular(selecionadas as Partial<Record<Instrumento, number[]>>);
      const { error } = await db
        .from("resultados")
        .upsert({ candidato_id: conv.candidatoId, dados: resultado, calculado_em: agora });
      if (error) return erro("Não foi possível registrar o envio. Tente de novo.", 500);
      // Queima o link: só um envio vale
      const { data: marcado } = await db
        .from("convites").update({ concluido_em: agora })
        .eq("id", conv.conviteId).is("concluido_em", null).select("id");
      if (!marcado?.length) return erro(MENSAGENS.concluido.titulo, 409);
      await db.from("candidatos").update({ concluido_em: agora }).eq("id", conv.candidatoId);
      return NextResponse.json({ ok: true });
    }

    default:
      return erro("Ação desconhecida.", 400);
  }
}
