"use client";
export default function BotaoImprimir() {
  return <button className="btn" onClick={() => window.print()}>Imprimir ou salvar em PDF</button>;
}
