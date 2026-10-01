import { notFound } from "next/navigation";
import { admin } from "@/lib/supabase/admin";
import { IND, LOC, MOT, BAS, faixaMotivograma, type Resultado } from "@/lib/instrumentos";
import BotaoImprimir from "@/components/BotaoImprimir";
import ExcluirCandidato from "@/components/ExcluirCandidato";

export const dynamic = "force-dynamic";

const fmt = (n: number) => n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const minus = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

function Barra({ valor, max, rotulo, detalhe, cor }: { valor: number; max: number; rotulo: string; detalhe?: string; cor?: string }) {
  return (
    <div className="barra-linha">
      <span className="rot">{rotulo}</span>
      <span className="trilho" role="img" aria-label={`${rotulo}: ${valor} de ${max}`}>
        <i style={{ width: `${(valor / max) * 100}%`, background: cor }} />
      </span>
      <span className="val">{valor}{detalhe && <small>{detalhe}</small>}</span>
    </div>
  );
}

function Lista({ titulo, itens }: { titulo: string; itens: string[] }) {
  return (
    <>
      <h4>{titulo}</h4>
      <ul>{itens.map((t) => <li key={t}>{t}</li>)}</ul>
    </>
  );
}

export default async function Relatorio({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = admin();
  const { data: c } = await db.from("candidatos").select("id, nome, email, cargo, empresa, cidade, concluido_em").eq("id", id).maybeSingle();
  if (!c) notFound();
  const { data: res } = await db.from("resultados").select("dados").eq("candidato_id", id).maybeSingle();

  if (!res) {
    return (
      <section className="cartao">
        <h1>{c.nome}</h1>
        <p className="vazio">Este candidato ainda não concluiu a avaliação.</p>
        <a className="btn-sec" href="/painel">Voltar ao painel</a>
      </section>
    );
  }

  const r = res.dados as Resultado;
  const tipo = r.indicador.tipo;
  const [apelido, resumoTipo] = IND.TYPES[tipo] ?? ["", ""];
  const nivel = LOC.LEVELS[r.locus.faixa];
  const m = r.motivograma;
  const [p1, p2, , , p5] = m.ranking;
  const N = MOT.N;
  const b = r.bases;
  const [d, s, l] = b.ordem;
  const dados = [c.cargo, c.empresa, c.cidade].filter(Boolean).join(", ");

  return (
    <article className="relatorio">
      <header className="cab-relatorio">
        <div>
          <h1>{c.nome}</h1>
          {dados && <p>{dados}</p>}
          {c.concluido_em && <p className="nota">Avaliação concluída em {new Date(c.concluido_em).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}</p>}
        </div>
        <div className="botoes nao-imprimir">
          <BotaoImprimir />
          <a className="btn-sec" href="/painel">Voltar</a>
        </div>
      </header>

      {/* ---------- Indicador Tipológico ---------- */}
      <section className="bloco">
        <h2>Indicador Tipológico</h2>
        <div className="tipo">
          <div className="letras" aria-label={tipo.split("").map((x) => IND.NAMES[x]).join(", ")}>
            {tipo.split("").map((x, i) => <span key={i} title={IND.NAMES[x]}>{x}</span>)}
          </div>
          <div>
            <p className="apelido">{apelido}</p>
            <p className="nota">{tipo.split("").map((x) => IND.NAMES[x]).join(", ")}</p>
          </div>
        </div>
        <p>{resumoTipo}</p>
        <div className="dimensoes">
          {IND.PAIRS.map(([a, z, rot]) => {
            const ca = r.indicador.contagens[a], cz = r.indicador.contagens[z];
            const vence = ca >= cz;
            return (
              <div key={a} className="dim">
                <p className="rot-dim">{rot}</p>
                <div className="lados">
                  <span className={vence ? "vence" : ""}>{IND.NAMES[a]} ({a}) {ca}</span>
                  <span className={!vence ? "vence" : ""}>{cz} {IND.NAMES[z]} ({z})</span>
                </div>
                <div className="divisao"><i style={{ width: `${(ca / (ca + cz)) * 100}%` }} className={vence ? "vence" : ""} /><i style={{ width: `${(cz / (ca + cz)) * 100}%` }} className={!vence ? "vence" : ""} /></div>
              </div>
            );
          })}
        </div>
        <p className="nota">Cada par tem 11 perguntas. A preferência que apareceu mais vezes compõe o tipo. Diferenças pequenas (6 a 5, 7 a 4) indicam preferência pouco definida e merecem ser exploradas na entrevista.</p>
      </section>

      {/* ---------- Locus de Controle ---------- */}
      <section className="bloco">
        <h2>Lócus de Controle</h2>
        <div className="indice">
          <span className="numero">{r.locus.indice === null ? "máximo" : fmt(r.locus.indice)}</span>
          <div>
            <p className="apelido">{nivel.title}</p>
            <p className="nota">Controle interno {r.locus.ci} pontos, controle externo {r.locus.ce} pontos</p>
          </div>
        </div>
        <p>{nivel.text}{r.locus.indice === null ? " Nenhum ponto foi atribuído a controle externo." : ""}</p>
        <ol className="faixas">
          {LOC.LEVELS.map((lv, k) => (
            <li key={lv.range} className={k === r.locus.faixa ? "atual" : ""}>
              <strong>{lv.range}</strong><span>{lv.title}</span>
            </li>
          ))}
        </ol>
        <p className="nota">O índice divide os pontos de controle interno pelos de controle externo.</p>
      </section>

      {/* ---------- Motivograma ---------- */}
      <section className="bloco">
        <h2>Motivograma</h2>
        <p className="apelido">{m.equilibrada ? "Motivação equilibrada" : `Necessidade predominante: ${N[p1].nome}`}</p>
        <p>
          {m.equilibrada
            ? `Nenhuma necessidade se destaca de forma marcante. ${N[p1].nome} aparece ligeiramente à frente, e a mais atendida hoje é ${N[p5].nome}.`
            : `${N[p1].resumo} Em seguida vem ${N[p2].nome}, e a necessidade mais atendida hoje é ${N[p5].nome}.`}
        </p>
        <div className="barras">
          {m.ranking.map((x) => (
            <Barra key={x} rotulo={`${N[x].L} ${N[x].nome}`} valor={m.totais[x]} max={36} detalhe={faixaMotivograma(m.totais[x])} cor={`var(--mot-${x})`} />
          ))}
        </div>
        <p className="nota">Escala de 0 a 36 por necessidade; a média esperada é 18. Respostas firmes (3 a 0): {m.fortes} de 30.</p>

        <div className="interpretacao">
          <h3>{N[p1].nome}</h3>
          <p>{N[p1].alto}</p>
          <Lista titulo="Como costuma aparecer no trabalho" itens={N[p1].trabalho} />
          <Lista titulo="O que tende a motivar" itens={N[p1].motivar} />
          <Lista titulo="Riscos" itens={N[p1].riscos} />
          <p><strong>Encaixe:</strong> {N[p1].encaixe}</p>
          <p><strong>Ponto de atenção:</strong> {N[p1].atencao}</p>
          <Lista titulo="Perguntas para a entrevista" itens={N[p1].perguntas} />

          <h3>{N[p2].nome}, em segundo lugar</h3>
          <p>{N[p2].alto}</p>
          <Lista titulo="Perguntas para a entrevista" itens={N[p2].perguntas} />

          <h3>{N[p5].nome}, a mais atendida</h3>
          <p>{N[p5].baixo}</p>
        </div>
      </section>

      {/* ---------- Bases Motivacionais ---------- */}
      <section className="bloco">
        <h2>Bases Motivacionais</h2>
        <p className="apelido">
          {b.equilibrada ? `Equilíbrio entre ${BAS.M[d].nome} e ${BAS.M[s].nome}` : `Base predominante: ${BAS.M[d].nome}`}
        </p>
        <p>
          {b.equilibrada
            ? `As duas bases estão muito próximas (diferença de ${b.diferenca} ponto${b.diferenca === 1 ? "" : "s"}). ${BAS.M[d].resumo} Ao mesmo tempo, ${minus(BAS.M[s].resumo)}`
            : `${BAS.M[d].resumo} A segunda base mais presente é ${BAS.M[s].nome}, e a menos presente é ${BAS.M[l].nome}.`}
        </p>
        <div className="barras">
          {b.ordem.map((x) => (
            <Barra key={x} rotulo={`${x} ${BAS.M[x].nome}`} valor={b.totais[x]} max={135} detalhe={`${Math.round((b.totais[x] / 135) * 100)}%`} cor={`var(--bas-${x})`} />
          ))}
        </div>
        <div className="interpretacao">
          <h3>{BAS.M[d].nome}</h3>
          {BAS.M[d].texto.map((p) => <p key={p}>{p}</p>)}
          {b.equilibrada && (
            <>
              <h3>{BAS.M[s].nome}</h3>
              {BAS.M[s].texto.map((p) => <p key={p}>{p}</p>)}
            </>
          )}
        </div>
      </section>

      <footer className="rodape-relatorio">
        <p>Os resultados descrevem preferências e o momento motivacional atual. Use-os como apoio à entrevista, nunca como critério isolado de aprovação ou reprovação.</p>
        <ExcluirCandidato id={c.id} nome={c.nome} />
      </footer>
    </article>
  );
}
