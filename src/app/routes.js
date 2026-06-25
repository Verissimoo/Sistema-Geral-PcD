// Tabela de rotas declarativa. Cada entrada vira uma <Route> protegida por
// ProtectedRoute(roles) com a página carregada via React.lazy (code-splitting).
// Paths e roles devem espelhar EXATAMENTE o App.jsx anterior.
const ADMIN_GERENTE = ["admin", "gerente"];
const COMERCIAL = ["admin", "gerente", "vendedor", "suporte"];
const SUPORTE = ["admin", "gerente", "suporte"];
const PARCEIRO = ["parceiro"];

export const routes = [
  // === ADMIN / GERENTE ===
  { path: "/", roles: ADMIN_GERENTE, page: () => import("@/features/dashboard/pages/Dashboard") },
  { path: "/contratos", roles: ADMIN_GERENTE, page: () => import("@/features/projetos/pages/Contractors") },
  { path: "/contratos/:id", roles: ADMIN_GERENTE, page: () => import("@/features/projetos/pages/ContractorDetail") },
  { path: "/projetos", roles: ADMIN_GERENTE, page: () => import("@/features/projetos/pages/ProjectKanban") },
  { path: "/metas", roles: ADMIN_GERENTE, page: () => import("@/features/metas/pages/Goals") },
  { path: "/rituais", roles: ADMIN_GERENTE, page: () => import("@/features/rituais/pages/Rituals") },
  { path: "/configuracoes", roles: ADMIN_GERENTE, page: () => import("@/features/configuracoes/pages/Settings") },
  { path: "/usuarios", roles: ADMIN_GERENTE, page: () => import("@/features/usuarios/pages/UserManagement") },

  // === PORTAL DO GERENTE ===
  { path: "/gerente/metas", roles: ADMIN_GERENTE, page: () => import("@/features/metas/pages/GerenteMetasComerciais") },
  { path: "/gerente/vendedores", roles: ADMIN_GERENTE, page: () => import("@/features/vendedores/pages/GerenteVendedores") },
  { path: "/gerente/vendedores/:id", roles: ADMIN_GERENTE, page: () => import("@/features/vendedores/pages/GerenteVendedorDetalhe") },
  { path: "/gerente/clientes", roles: ADMIN_GERENTE, page: () => import("@/features/clientes/pages/GerenteClientes") },
  { path: "/gerente/clientes/:id", roles: ADMIN_GERENTE, page: () => import("@/features/clientes/pages/GerenteClienteDetalhe") },
  { path: "/gerente/orcamentos", roles: ADMIN_GERENTE, page: () => import("@/features/orcamento/pages/GerenteOrcamentos") },
  { path: "/gerente/parceiros", roles: ADMIN_GERENTE, page: () => import("@/features/parceiros/pages/GerenteParceiros") },
  { path: "/gerente/campanhas", roles: ADMIN_GERENTE, page: () => import("@/features/campanhas/pages/GerenteCampanhas") },
  { path: "/gerente/campanhas/:id", roles: ADMIN_GERENTE, page: () => import("@/features/campanhas/pages/GerenteCampanhaDetalhe") },

  // === PORTAL DO VENDEDOR ===
  { path: "/vendedor", roles: COMERCIAL, page: () => import("@/features/vendedores/pages/VendedorHome") },
  { path: "/vendedor/ferramentas", roles: COMERCIAL, page: () => import("@/features/vendedores/pages/VendedorFerramentas") },
  { path: "/vendedor/cotacao", roles: COMERCIAL, page: () => import("@/features/cotacao/pages/VendedorCotacao") },
  { path: "/vendedor/orcamento", roles: COMERCIAL, page: () => import("@/features/orcamento/pages/VendedorOrcamento") },
  { path: "/vendedor/orcamentos", roles: COMERCIAL, page: () => import("@/features/orcamento/pages/VendedorOrcamentos") },
  { path: "/vendedor/milhas", roles: COMERCIAL, page: () => import("@/features/milhas/pages/VendedorMilhas") },
  { path: "/vendedor/carreira", roles: COMERCIAL, page: () => import("@/features/carreira/pages/VendedorCarreira") },
  { path: "/vendedor/informacoes", roles: COMERCIAL, page: () => import("@/features/vendedores/pages/VendedorInformacoes") },

  // === PORTAL DO SUPORTE ===
  { path: "/suporte/emissoes", roles: SUPORTE, page: () => import("@/features/emissoes/pages/SuporteEmissoes") },
  { path: "/suporte/historico", roles: SUPORTE, page: () => import("@/features/emissoes/pages/SuporteHistorico") },
  { path: "/suporte/contatos", roles: SUPORTE, page: () => import("@/features/emissoes/pages/SuporteContatos") },

  // === PORTAL DO PARCEIRO ===
  { path: "/parceiro/orcamentos", roles: PARCEIRO, page: () => import("@/features/orcamento/pages/ParceiroOrcamentos") },
  { path: "/parceiro/orcamentos/:id", roles: PARCEIRO, page: () => import("@/features/orcamento/pages/ParceiroOrcamentoDetalhe") },
  { path: "/parceiro/clientes", roles: PARCEIRO, page: () => import("@/features/clientes/pages/ParceiroClientes") },
  { path: "/parceiro/empresa", roles: PARCEIRO, page: () => import("@/features/parceiros/pages/ParceiroEmpresa") },
];
