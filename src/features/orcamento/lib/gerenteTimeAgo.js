// Formatação de "tempo desde" usada na Central de Orçamentos (gerente).
// Mantida idêntica ao comportamento original de GerenteOrcamentos (inclui
// "ontem" e cap em 30 dias antes de cair para data absoluta). Difere da versão
// do vendedor (que tem meses), por isso é uma função separada.
export const gerenteTimeAgo = (iso) => {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h}h`;
  const d = Math.floor(h / 24);
  if (d === 1) return "ontem";
  if (d < 30) return `há ${d}d`;
  return new Date(iso).toLocaleDateString("pt-BR");
};
