export const CULTURA_FRASE_PRINCIPAL =
  "A forma como eu penso define a forma como eu vendo.";

export const CULTURA_PILARES = [
  {
    id: "identidade",
    titulo: "Identidade",
    icon: "🎯",
    color: "amber",
    frases: [
      "Eu vendo bem e gero valor, por isso sou recompensado.",
      "Eu sou confiante e cada venda reforça isso.",
      "Minha postura cresce e minha comissão cresce.",
      "Eu vendo melhor quando acredito que posso prosperar.",
    ],
  },
  {
    id: "constancia",
    titulo: "Constância",
    icon: "⚡",
    color: "blue",
    frases: [
      "Eu não preciso estar motivado. Eu preciso executar.",
      "Eu melhoro um atendimento por vez.",
      "Eu sou constante porque meu crescimento depende disso.",
      "Eu avanço quando faço o que precisa ser feito.",
    ],
  },
  {
    id: "processo",
    titulo: "Processo",
    icon: "⚙️",
    color: "emerald",
    frases: [
      "Todo lead precisa de direção. Eu sou quem conduz.",
      "Atender rápido aumenta minhas chances de vender.",
      "Eu não vendo preço. Eu vendo segurança, clareza e solução.",
      "Eu transmito confiança, por isso compram comigo.",
    ],
  },
  {
    id: "crenca",
    titulo: "Crença",
    icon: "💎",
    color: "purple",
    frases: [
      "Quanto mais eu ajo como vendedor, mais natural vender se torna.",
      "Aquilo que eu acredito sobre vendas define como eu vendo.",
      "Eu procuro evidências de que vender é fácil.",
      "Se eu acredito que posso vender, eu ajo como alguém que vende.",
      "Eu vendo porque atendo melhor.",
      "Eu vendo porque pergunto melhor.",
      "Eu vendo porque acompanho melhor.",
      "Eu vendo porque sigo o processo.",
    ],
  },
];

// Todas as frases planificadas, com referência ao pilar de origem.
export const TODAS_FRASES = CULTURA_PILARES.flatMap((p) =>
  p.frases.map((frase) => ({
    frase,
    pilar: p.titulo,
    pilarId: p.id,
    icon: p.icon,
    color: p.color,
  })),
);

// Frase determinística do dia — todos veem a mesma frase na mesma data.
export function getFraseDoDia(date = new Date()) {
  const start = new Date(date.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((date - start) / (1000 * 60 * 60 * 24));
  return TODAS_FRASES[dayOfYear % TODAS_FRASES.length];
}
