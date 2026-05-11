// Filtra quotes considerando apenas as que contam para métricas comerciais.
// Critério: somente quotes cujo seller_id pertence a um usuário com role
// 'vendedor' ou 'gerente'. Suporte e parceiro NÃO entram nas metas.
export function filterCommercialQuotes(quotes = [], users = []) {
  const commercialUserIds = new Set(
    (users || [])
      .filter((u) => u && (u.role === "vendedor" || u.role === "gerente"))
      .map((u) => u.id),
  );
  return (quotes || []).filter((q) => commercialUserIds.has(q.seller_id));
}

// Conveniência: lista apenas usuários do time comercial.
export function getCommercialUsers(users = []) {
  return (users || []).filter(
    (u) => u && (u.role === "vendedor" || u.role === "gerente"),
  );
}
