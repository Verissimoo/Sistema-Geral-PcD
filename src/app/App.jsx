import { Toaster } from "@/shared/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/shared/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from "@/shared/components/PageNotFound";
import Layout from "@/shared/components/Layout";
import Dashboard from "@/features/dashboard/pages/Dashboard";
import Contractors from "@/features/projetos/pages/Contractors";
import ContractorDetail from "@/features/projetos/pages/ContractorDetail";
import ProjectKanban from "@/features/projetos/pages/ProjectKanban";
import Goals from "@/features/metas/pages/Goals";
import Rituals from "@/features/rituais/pages/Rituals";
import Settings from "@/features/configuracoes/pages/Settings";
import Login from "@/features/auth/Login";
import UserManagement from "@/features/usuarios/pages/UserManagement";
import GerenteMetasComerciais from "@/features/metas/pages/GerenteMetasComerciais";
import GerenteVendedores from "@/features/vendedores/pages/GerenteVendedores";
import GerenteVendedorDetalhe from "@/features/vendedores/pages/GerenteVendedorDetalhe";
import GerenteClientes from "@/features/clientes/pages/GerenteClientes";
import GerenteClienteDetalhe from "@/features/clientes/pages/GerenteClienteDetalhe";
import GerenteOrcamentos from "@/features/orcamento/pages/GerenteOrcamentos";
import GerenteParceiros from "@/features/parceiros/pages/GerenteParceiros";
import { AuthProvider } from "@/features/auth/AuthContext";
import { ProtectedRoute } from "@/features/auth/ProtectedRoute";

// Portal do Vendedor
import VendedorHome from "@/features/vendedores/pages/VendedorHome";
import VendedorFerramentas from "@/features/vendedores/pages/VendedorFerramentas";
import VendedorCotacao from "@/features/cotacao/pages/VendedorCotacao";
import VendedorOrcamento from "@/features/orcamento/pages/VendedorOrcamento";
import VendedorOrcamentos from "@/features/orcamento/pages/VendedorOrcamentos";
import VendedorMilhas from "@/features/milhas/pages/VendedorMilhas";
import VendedorCarreira from "@/features/carreira/pages/VendedorCarreira";
import VendedorInformacoes from "@/features/vendedores/pages/VendedorInformacoes";

// Portal do Parceiro
import ParceiroOrcamentos from "@/features/orcamento/pages/ParceiroOrcamentos";
import ParceiroOrcamentoDetalhe from "@/features/orcamento/pages/ParceiroOrcamentoDetalhe";
import ParceiroClientes from "@/features/clientes/pages/ParceiroClientes";
import ParceiroEmpresa from "@/features/parceiros/pages/ParceiroEmpresa";

// Portal do Suporte
import SuporteEmissoes from "@/features/emissoes/pages/SuporteEmissoes";
import SuporteHistorico from "@/features/emissoes/pages/SuporteHistorico";
import SuporteContatos from "@/features/emissoes/pages/SuporteContatos";

function App() {
  return (
    <QueryClientProvider client={queryClientInstance}>
      <AuthProvider>
        <Router>
          <Routes>
            {/* Login — sem layout, sem proteção */}
            <Route path="/login" element={<Login />} />

            {/* Rotas protegidas dentro do Layout */}
            <Route element={
              <ProtectedRoute allowedRoles={['admin', 'gerente', 'vendedor', 'parceiro', 'suporte']}>
                <Layout />
              </ProtectedRoute>
            }>
              {/* === ROTAS ADMIN ONLY === */}
              <Route path="/" element={
                <ProtectedRoute allowedRoles={['admin', 'gerente']}>
                  <Dashboard />
                </ProtectedRoute>
              } />
              <Route path="/contratos" element={
                <ProtectedRoute allowedRoles={['admin', 'gerente']}>
                  <Contractors />
                </ProtectedRoute>
              } />
              <Route path="/contratos/:id" element={
                <ProtectedRoute allowedRoles={['admin', 'gerente']}>
                  <ContractorDetail />
                </ProtectedRoute>
              } />
              <Route path="/projetos" element={
                <ProtectedRoute allowedRoles={['admin', 'gerente']}>
                  <ProjectKanban />
                </ProtectedRoute>
              } />
              <Route path="/metas" element={
                <ProtectedRoute allowedRoles={['admin', 'gerente']}>
                  <Goals />
                </ProtectedRoute>
              } />
              <Route path="/rituais" element={
                <ProtectedRoute allowedRoles={['admin', 'gerente']}>
                  <Rituals />
                </ProtectedRoute>
              } />
              <Route path="/configuracoes" element={
                <ProtectedRoute allowedRoles={['admin', 'gerente']}>
                  <Settings />
                </ProtectedRoute>
              } />
              <Route path="/usuarios" element={
                <ProtectedRoute allowedRoles={['admin', 'gerente']}>
                  <UserManagement />
                </ProtectedRoute>
              } />

              {/* === PORTAL DO GERENTE (admin only) === */}
              <Route path="/gerente/metas" element={
                <ProtectedRoute allowedRoles={['admin', 'gerente']}>
                  <GerenteMetasComerciais />
                </ProtectedRoute>
              } />
              <Route path="/gerente/vendedores" element={
                <ProtectedRoute allowedRoles={['admin', 'gerente']}>
                  <GerenteVendedores />
                </ProtectedRoute>
              } />
              <Route path="/gerente/vendedores/:id" element={
                <ProtectedRoute allowedRoles={['admin', 'gerente']}>
                  <GerenteVendedorDetalhe />
                </ProtectedRoute>
              } />
              <Route path="/gerente/clientes" element={
                <ProtectedRoute allowedRoles={['admin', 'gerente']}>
                  <GerenteClientes />
                </ProtectedRoute>
              } />
              <Route path="/gerente/clientes/:id" element={
                <ProtectedRoute allowedRoles={['admin', 'gerente']}>
                  <GerenteClienteDetalhe />
                </ProtectedRoute>
              } />
              <Route path="/gerente/orcamentos" element={
                <ProtectedRoute allowedRoles={['admin', 'gerente']}>
                  <GerenteOrcamentos />
                </ProtectedRoute>
              } />
              <Route path="/gerente/parceiros" element={
                <ProtectedRoute allowedRoles={['admin', 'gerente']}>
                  <GerenteParceiros />
                </ProtectedRoute>
              } />

              {/* === PORTAL DO VENDEDOR (admin + vendedor + suporte) === */}
              <Route path="/vendedor" element={
                <ProtectedRoute allowedRoles={['admin', 'gerente', 'vendedor', 'suporte']}><VendedorHome /></ProtectedRoute>
              } />
              <Route path="/vendedor/ferramentas" element={
                <ProtectedRoute allowedRoles={['admin', 'gerente', 'vendedor', 'suporte']}><VendedorFerramentas /></ProtectedRoute>
              } />
              <Route path="/vendedor/cotacao" element={
                <ProtectedRoute allowedRoles={['admin', 'gerente', 'vendedor', 'suporte']}><VendedorCotacao /></ProtectedRoute>
              } />
              <Route path="/vendedor/orcamento" element={
                <ProtectedRoute allowedRoles={['admin', 'gerente', 'vendedor', 'suporte']}><VendedorOrcamento /></ProtectedRoute>
              } />
              <Route path="/vendedor/orcamentos" element={
                <ProtectedRoute allowedRoles={['admin', 'gerente', 'vendedor', 'suporte']}><VendedorOrcamentos /></ProtectedRoute>
              } />
              <Route path="/vendedor/milhas" element={
                <ProtectedRoute allowedRoles={['admin', 'gerente', 'vendedor', 'suporte']}><VendedorMilhas /></ProtectedRoute>
              } />
              <Route path="/vendedor/carreira" element={
                <ProtectedRoute allowedRoles={['admin', 'gerente', 'vendedor', 'suporte']}><VendedorCarreira /></ProtectedRoute>
              } />
              <Route path="/vendedor/informacoes" element={
                <ProtectedRoute allowedRoles={['admin', 'gerente', 'vendedor', 'suporte']}><VendedorInformacoes /></ProtectedRoute>
              } />

              {/* === PORTAL DO SUPORTE (suporte + admin) === */}
              <Route path="/suporte/emissoes" element={
                <ProtectedRoute allowedRoles={['admin', 'gerente', 'suporte']}><SuporteEmissoes /></ProtectedRoute>
              } />
              <Route path="/suporte/historico" element={
                <ProtectedRoute allowedRoles={['admin', 'gerente', 'suporte']}><SuporteHistorico /></ProtectedRoute>
              } />
              <Route path="/suporte/contatos" element={
                <ProtectedRoute allowedRoles={['admin', 'gerente', 'suporte']}><SuporteContatos /></ProtectedRoute>
              } />

              {/* === PORTAL DO PARCEIRO (parceiro only) === */}
              <Route path="/parceiro/orcamentos" element={
                <ProtectedRoute allowedRoles={['parceiro']}><ParceiroOrcamentos /></ProtectedRoute>
              } />
              <Route path="/parceiro/orcamentos/:id" element={
                <ProtectedRoute allowedRoles={['parceiro']}><ParceiroOrcamentoDetalhe /></ProtectedRoute>
              } />
              <Route path="/parceiro/clientes" element={
                <ProtectedRoute allowedRoles={['parceiro']}><ParceiroClientes /></ProtectedRoute>
              } />
              <Route path="/parceiro/empresa" element={
                <ProtectedRoute allowedRoles={['parceiro']}><ParceiroEmpresa /></ProtectedRoute>
              } />

              <Route path="*" element={<PageNotFound />} />
            </Route>
          </Routes>
          <Toaster />
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  )
}

export default App
