// Tabela de taxas agora vive em @/shared/lib/cardFees (fonte única, reusada
// também pelo gerador de orçamento). Re-exportada aqui por compatibilidade.
export { PLATFORMS } from "@/shared/lib/cardFees";

export const fmt = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
