"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Instrumento, Publico, Respostas } from "@/lib/instrumentos";


type Config = {
  titulo: string;
  minutos: number;
  duracao: string;
  intro: string[];
  tipo: "escolha" | "pontos";
  max: number;
  rotuloItem: string;
  perguntaFixa?: string;
  escala?: string[];
};

/* Textos de instrução: os mesmos dos questionários originais */
const CONFIG: Record<Instrumento, Config> = {
  indicador: {
    titulo: "Indicador Tipológico",
    minutos: 10,
    duracao: "44 perguntas, cerca de 10 minutos",
    intro: [
      "Este questionário ajuda a entender a forma como você prefere se relacionar, perceber o mundo, tomar decisões e organizar sua rotina.",
      "Não há respostas certas ou erradas: escolha a opção que mais combina com você no dia a dia.",
    ],
    tipo: "escolha",
    max: 2,
    rotuloItem: "Pergunta",
  },
  locus: {
    titulo: "Lócus de Controle",
    minutos: 10,
    duracao: "20 questões, cerca de 10 minutos",
    intro: [
      "Este inventário identifica o quanto você atribui seus resultados ao próprio esforço e capacidade, ou a fatores externos como sorte, destino e circunstâncias.",
      "Em cada questão, distribua 5 pontos entre as afirmações A e B. Dê mais pontos àquela com que você concorda mais: 5 e 0 se concorda plenamente com uma e discorda totalmente da outra; 4 e 1 se concorda muito com uma e um pouco com a outra; 3 e 2 se concorda só ligeiramente mais com uma delas.",
      "Ao marcar a nota de uma afirmação, a outra se completa sozinha. Seja verdadeiro consigo mesmo.",
    ],
    tipo: "pontos",
    max: 5,
    rotuloItem: "Questão",
    perguntaFixa: "Com qual afirmação você concorda mais?",
  },
  motivograma: {
    titulo: "Motivograma",
    minutos: 8,
    duracao: "30 proposições, cerca de 8 minutos",
    intro: [
      "Este questionário mostra o seu perfil de motivação individual. Não é um teste de conhecimentos: não há alternativas boas ou más, corretas ou incorretas.",
      "Cada proposição tem duas alternativas. Dê 2 ou 3 pontos à que você considera mais significativa e 0 ou 1 à outra. As duas sempre somam 3 pontos.",
      "Escolha a que mais se parece com o que você faz, costuma fazer ou faria naquela situação.",
    ],
    tipo: "pontos",
    max: 3,
    rotuloItem: "Proposição",
    escala: ["nada", "pouco", "significativa", "muito mais"],
  },
  bases: {
    titulo: "Bases Motivacionais",
    minutos: 10,
    duracao: "45 pares de afirmações, cerca de 10 minutos",
    intro: [
      "Este questionário ajuda a entender o que mais move você no trabalho e nas relações com as pessoas.",
      "Em cada par, distribua 3 pontos entre as duas afirmações. Quanto mais pontos, mais aquela afirmação motiva você. As duas sempre somam 3.",
      "Seja sincero: a melhor resposta é a que reflete você no dia a dia.",
    ],
    tipo: "pontos",
    max: 3,
    rotuloItem: "Par",
    perguntaFixa: "Qual destas afirmações motiva mais você?",
    escala: ["menos", "possível", "bem", "muito mais"],
  },
};

type Tela =
  | { t: "consentimento" }
  | { t: "intro"; k: number }
  | { t: "item"; k: number; i: number }
  | { t: "revisao" }
  | { t: "enviado" }
  | { t: "bloqueado"; msg: string };

type Props = {
  token: string;
  nome: string;
  consentido: boolean;
  instrumentos: Instrumento[];
  conteudo: Partial<Publico>;
  respostasIniciais: Respostas;
};

const EXTENSO = ["", "um", "dois", "três", "quatro"];

function telaInicial(consentido: boolean, r: Respostas, ORDEM: Instrumento[]): Tela {
  if (!consentido) return { t: "consentimento" };
  for (let k = 0; k < ORDEM.length; k++) {
    const arr = r[ORDEM[k]]!;
    const i = arr.findIndex((v) => v === null);
    if (i === -1) continue;
    return arr.some((v) => v !== null) ? { t: "item", k, i } : { t: "intro", k };
  }
  return { t: "revisao" };
}

export default function Jornada({ token, nome, consentido, instrumentos, conteudo, respostasIniciais }: Props) {
  const ORDEM = instrumentos;
  const N = ORDEM.length;
  const ultimo = N - 1;
  const minutosTotal = ORDEM.reduce((t, k) => t + CONFIG[k].minutos, 0);
  const [resp, setResp] = useState<Respostas>(respostasIniciais);
  const [tela, setTela] = useState<Tela>(() => telaInicial(consentido, respostasIniciais, instrumentos));
  const r = (inst: Instrumento) => resp[inst]!;
  const [salvamento, setSalvamento] = useState<"ok" | "salvando" | "erro">("ok");
  const [enviando, setEnviando] = useState(false);
  const [msgEnvio, setMsgEnvio] = useState("");
  const pendentes = useRef<Partial<Record<Instrumento, ReturnType<typeof setTimeout>>>>({});
  const respRef = useRef(resp);
  respRef.current = resp;
  const avanco = useRef<ReturnType<typeof setTimeout> | null>(null);
  const primeiro = nome.split(/\s+/)[0];

  const api = useCallback(
    async (corpo: object) => {
      const r = await fetch(`/api/avaliacao/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(corpo),
      });
      const j = await r.json().catch(() => ({}));
      if (r.status === 410) setTela({ t: "bloqueado", msg: j.erro ?? "Este link não está mais disponível." });
      return { ok: r.ok, status: r.status, erro: j.erro as string | undefined };
    },
    [token]
  );

  const salvar = useCallback(
    async (inst: Instrumento) => {
      setSalvamento("salvando");
      try {
        const r = await api({ acao: "salvar", instrumento: inst, respostas: respRef.current[inst] });
        setSalvamento(r.ok ? "ok" : "erro");
        return r.ok;
      } catch {
        setSalvamento("erro");
        return false;
      }
    },
    [api]
  );

  const agendarSalvar = (inst: Instrumento) => {
    clearTimeout(pendentes.current[inst]);
    pendentes.current[inst] = setTimeout(() => {
      delete pendentes.current[inst];
      salvar(inst);
    }, 600);
  };

  const descarregar = async () => {
    const lista = Object.keys(pendentes.current) as Instrumento[];
    lista.forEach((k) => clearTimeout(pendentes.current[k]));
    pendentes.current = {};
    const res = await Promise.all(lista.map(salvar));
    return res.every(Boolean);
  };

  // Ao sair da página com algo pendente, tenta salvar
  useEffect(() => {
    const aviso = (e: BeforeUnloadEvent) => {
      if (Object.keys(pendentes.current).length) {
        descarregar();
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", aviso);
    return () => window.removeEventListener("beforeunload", aviso);
  });

  useEffect(() => { window.scrollTo({ top: 0 }); }, [tela.t, tela.t === "item" ? tela.k : 0]);

  // ---------- Navegação ----------
  const proximo = (k: number, i: number) => {
    const inst = ORDEM[k];
    const arr = respRef.current[inst]!;
    if (i < arr.length - 1) return setTela({ t: "item", k, i: i + 1 });
    const falta = arr.findIndex((v) => v === null);
    if (falta !== -1) return setTela({ t: "item", k, i: falta });
    setTela(k < ultimo ? { t: "intro", k: k + 1 } : { t: "revisao" });
  };
  const anterior = (k: number, i: number) => {
    if (i > 0) setTela({ t: "item", k, i: i - 1 });
    else setTela({ t: "intro", k });
  };

  const responder = (k: number, i: number, valor: number) => {
    const inst = ORDEM[k];
    const atual = respRef.current;
    const novo = { ...atual, [inst]: atual[inst]!.map((v, j) => (j === i ? valor : v)) };
    respRef.current = novo;
    setResp(novo);
    agendarSalvar(inst);
    if (avanco.current) clearTimeout(avanco.current);
    avanco.current = setTimeout(() => proximo(k, i), 450);
  };

  // Atalhos de teclado nas perguntas
  useEffect(() => {
    if (tela.t !== "item") return;
    const { k, i } = tela;
    const cfg = CONFIG[ORDEM[k]];
    const tecla = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      const n = Number(e.key);
      if (cfg.tipo === "escolha" && (e.key === "1" || e.key === "2")) responder(k, i, n);
      else if (cfg.tipo === "pontos" && /^[0-9]$/.test(e.key) && n <= cfg.max) responder(k, i, n);
      else if (e.key === "ArrowLeft") anterior(k, i);
      else if (e.key === "ArrowRight" && respRef.current[ORDEM[k]]![i] !== null) proximo(k, i);
    };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  });

  const aceitar = async () => {
    const r = await api({ acao: "consentir" });
    if (r.ok) setTela(telaInicial(true, respRef.current, ORDEM));
  };

  const enviar = async () => {
    setEnviando(true);
    setMsgEnvio("");
    const salvo = await descarregar();
    if (!salvo) {
      setEnviando(false);
      return setMsgEnvio("Algumas respostas ainda não foram salvas. Verifique sua conexão e tente enviar de novo.");
    }
    const r = await api({ acao: "concluir" }).catch(() => ({ ok: false, status: 0, erro: undefined }));
    setEnviando(false);
    if (r.ok || r.status === 409) setTela({ t: "enviado" });
    else if (r.status !== 410) setMsgEnvio(r.erro ?? "Não foi possível enviar. Verifique sua conexão e tente de novo.");
  };

  // ---------- Telas ----------
  const etapaAtual = tela.t === "intro" || tela.t === "item" ? tela.k : tela.t === "revisao" || tela.t === "enviado" ? N : -1;

  return (
    <div className="jornada">
      <header className="topo">
        <span className="marca">RJL Consultoria</span>
        {etapaAtual >= 0 && tela.t !== "enviado" && N > 1 && (
          <ol className="etapas" aria-label="Etapas da avaliação">
            {ORDEM.map((inst, k) => (
              <li key={inst} className={k === etapaAtual ? "atual" : k < etapaAtual ? "feita" : ""} aria-current={k === etapaAtual ? "step" : undefined}>
                <span className="num">{k + 1}</span>
                <span className="nome">{CONFIG[inst].titulo}</span>
              </li>
            ))}
          </ol>
        )}
      </header>

      <main className="palco">
        {tela.t === "consentimento" && (
          <section className="cartao estreito">
            <h1>Olá, {primeiro}.</h1>
            <p className="lead">
              Esta avaliação faz parte do processo seletivo.{" "}
              {N === 1 ? `É um questionário curto: ${CONFIG[ORDEM[0]].titulo}.` : `São ${EXTENSO[N]} questionários curtos sobre como você prefere trabalhar, decidir e se relacionar.`}{" "}
              O tempo total é de cerca de {minutosTotal} minutos.
            </p>
            <p>Não há respostas certas ou erradas. Você pode parar a qualquer momento e continuar depois pelo mesmo link: cada resposta fica salva assim que você marca.</p>
            <div className="termo">
              <h2>Uso das suas respostas</h2>
              <p>
                Suas respostas e os resultados serão usados apenas neste processo seletivo, acessados somente pela equipe de recrutamento e armazenados com segurança por até 180 dias. Você pode pedir a exclusão dos seus dados a qualquer momento pelo contato de quem enviou o convite.
              </p>
              <p>Os resultados não são exibidos ao final: eles são analisados pela equipe de recrutamento, como apoio à entrevista.</p>
            </div>
            <button className="btn" onClick={aceitar}>Concordo e quero começar</button>
          </section>
        )}

        {tela.t === "intro" && (() => {
          const cfg = CONFIG[ORDEM[tela.k]];
          const feitas = r(ORDEM[tela.k]).filter((v) => v !== null).length;
          return (
            <section className="cartao estreito">
              {N > 1 && <p className="contexto">Etapa {tela.k + 1} de {N}</p>}
              <h1>{cfg.titulo}</h1>
              <p className="duracao">{cfg.duracao}</p>
              {cfg.intro.map((p) => <p key={p}>{p}</p>)}
              {cfg.escala && (
                <dl className="escala">
                  {cfg.escala.map((r, v) => (
                    <div key={r}><dt>{v}</dt><dd>{r}</dd></div>
                  ))}
                </dl>
              )}
              <button className="btn" onClick={() => {
                const falta = r(ORDEM[tela.k]).findIndex((v) => v === null);
                setTela({ t: "item", k: tela.k, i: falta === -1 ? 0 : falta });
              }}>
                {feitas > 0 ? "Continuar de onde parei" : "Começar"}
              </button>
            </section>
          );
        })()}

        {tela.t === "item" && (() => {
          const { k, i } = tela;
          const inst = ORDEM[k];
          const cfg = CONFIG[inst];
          const item = conteudo[inst]![i] as { pergunta?: string; a: string; b: string };
          const valor = r(inst)[i];
          const total = r(inst).length;
          const feitas = r(inst).filter((v) => v !== null).length;
          return (
            <section className="cartao pergunta" key={`${k}-${i}`}>
              <div className="progresso">
                <span>{cfg.rotuloItem} {i + 1} de {total}</span>
                <span className="salvo" aria-live="polite">
                  {salvamento === "salvando" ? "Salvando" : salvamento === "erro" ? "Sem conexão: tentaremos de novo" : "Respostas salvas"}
                </span>
              </div>
              <div className="barra" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={feitas}>
                <i style={{ width: `${(feitas / total) * 100}%` }} />
              </div>

              <h2 className="enunciado">{item.pergunta ?? cfg.perguntaFixa}</h2>

              {cfg.tipo === "escolha" ? (
                <div className="opcoes" role="radiogroup">
                  {[item.a, item.b].map((texto, j) => (
                    <button key={j} type="button" role="radio" aria-checked={valor === j + 1}
                      className={`opcao ${valor === j + 1 ? "marcada" : ""}`} onClick={() => responder(k, i, j + 1)}>
                      <span className="tecla">{j + 1}</span>
                      <span>{texto}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="afirmacoes">
                  {(["A", "B"] as const).map((lado) => {
                    const texto = lado === "A" ? item.a : item.b;
                    const pts = valor === null ? null : lado === "A" ? valor : cfg.max - valor;
                    return (
                      <div key={lado} className={`afirmacao ${pts !== null && pts > cfg.max / 2 ? "forte" : ""}`}>
                        <div className="texto"><span className="letra">{lado}</span><p>{texto}</p></div>
                        <div className="pontos" role="radiogroup" aria-label={`Pontos para a afirmação ${lado}`}>
                          {Array.from({ length: cfg.max + 1 }, (_, v) => (
                            <button key={v} type="button" role="radio" aria-checked={pts === v}
                              className={pts === v ? "marcado" : ""}
                              onClick={() => responder(k, i, lado === "A" ? v : cfg.max - v)}>
                              <b>{v}</b>
                              {cfg.escala && <small>{cfg.escala[v]}</small>}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                  <p className="regra">
                    {valor === null
                      ? `Dê de 0 a ${cfg.max} pontos a uma das afirmações. A outra recebe o restante, completando ${cfg.max}.`
                      : `A recebe ${valor} e B recebe ${cfg.max - valor}, total ${cfg.max}.`}
                  </p>
                </div>
              )}

              <nav className="navegacao">
                <button className="btn-sec" onClick={() => anterior(k, i)}>Voltar</button>
                <button className="btn" disabled={valor === null} onClick={() => proximo(k, i)}>
                  {i === total - 1 ? (k === ultimo ? "Revisar e enviar" : "Concluir etapa") : "Próxima"}
                </button>
              </nav>
              {salvamento === "erro" && (
                <p className="erro">
                  Não conseguimos salvar a última resposta.{" "}
                  <button className="btn-link" onClick={() => salvar(inst)}>Tentar agora</button>
                </p>
              )}
            </section>
          );
        })()}

        {tela.t === "revisao" && (
          <section className="cartao estreito">
            <p className="contexto">Último passo</p>
            <h1>Tudo respondido</h1>
            <p className="lead">{N === 1 ? "Você respondeu a todas as perguntas." : `Você respondeu às ${EXTENSO[N]} etapas.`} Depois de enviar, não será possível alterar as respostas e este link deixará de funcionar.</p>
            <ul className="resumo-etapas">
              {ORDEM.map((inst) => (
                <li key={inst}>
                  <span>{CONFIG[inst].titulo}</span>
                  <span>{r(inst).filter((v) => v !== null).length} de {r(inst).length}</span>
                </li>
              ))}
            </ul>
            <div className="navegacao">
              <button className="btn-sec" onClick={() => setTela({ t: "item", k: ultimo, i: r(ORDEM[ultimo]).length - 1 })}>Voltar às perguntas</button>
              <button className="btn" onClick={enviar} disabled={enviando}>{enviando ? "Enviando" : "Enviar respostas"}</button>
            </div>
            {msgEnvio && <p className="erro">{msgEnvio}</p>}
          </section>
        )}

        {tela.t === "enviado" && (
          <section className="cartao estreito">
            <h1>Respostas enviadas</h1>
            <p className="lead">Obrigado, {primeiro}. Recebemos a sua avaliação e a equipe de recrutamento entrará em contato sobre as próximas etapas.</p>
            <p>Você já pode fechar esta página.</p>
          </section>
        )}

        {tela.t === "bloqueado" && (
          <section className="aviso">
            <h1>{tela.msg}</h1>
            <p>Se precisar de ajuda, fale com quem enviou o convite.</p>
          </section>
        )}
      </main>
    </div>
  );
}
