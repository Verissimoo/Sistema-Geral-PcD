export const fmt = (value) =>
  value?.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) ??
  "R$ 0,00";
