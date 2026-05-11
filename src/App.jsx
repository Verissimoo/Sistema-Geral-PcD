import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Contractors from './pages/Contractors';
import ContractorDetail from './pages/ContractorDetail';
import ProjectKanban from './pages/ProjectKanban';
import Goals from './pages/Goals';
import Rituals from './pages/Rituals';
import Settings from './pages/Settings';
import Login from './pages/Login';
import UserManagement from './pages/UserManagement';
import GerenteMetasComerciais from './pages/gerente/GerenteMetasComerciais';
import GerenteVendedores from './pages/gerente/GerenteVendedores';
import GerenteVendedorDetalhe from './pages/gerente/GerenteVendedorDetalhe';
import GerenteClientes from './pages/gerente/GerenteClientes';
import GerenteClienteDetalhe from './pages/gerente/GerenteClienteDetalhe';
import GerenteOrcamentos from './pages/gerente/GerenteOrcamentos';
import GerenteParceiros from './pages/gerente/GerenteParceiros';
import { AuthProvider } from './lib/AuthContext';
import { ProtectedRoute } from './lib/ProtectedRoute';

// Portal do Vendedor
import VendedorHome from './pages/vendedor/VendedorHome';
import VendedorFerramentas from './pages/vendedor/VendedorFerramentas';
import VendedorCotacao from './pages/vendedor/VendedorCotacao';
import VendedorOrcamento from './pages/vendedor/VendedorOrcamento';
import VendedorOrcamentos from './pages/vendedor/VendedorOrcamentos';
import VendedorMilhas from './pages/vendedor/VendedorMilhas';
import VendedorCarreira from './pages/vendedor/VendedorCarreira';
import VendedorInformacoes from './pages/vendedor/VendedorInformacoes';

// Portal do Parceiro
import ParceiroOrcamentos from './pages/parceiro/ParceiroOrcamentos';
import ParceiroOrcamentoDetalhe from './pages/parceiro/ParceiroOrcamentoDetalhe';
import ParceiroClientes from './pages/parceiro/ParceiroClientes';
import ParceiroEmpresa from './pages/parceiro/ParceiroEmpresa';

// Portal do Suporte
import SuporteEmissoes from './pages/suporte/SuporteEmissoes';
import SuporteHistorico from './pages/suporte/SuporteHistorico';
import SuporteContatos from './pages/suporte/SuporteContatos';

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
