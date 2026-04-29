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
import { AuthProvider } from './lib/AuthContext';
import { ProtectedRoute } from './lib/ProtectedRoute';

// Portal do Vendedor
import VendedorFerramentas from './pages/vendedor/VendedorFerramentas';
import VendedorCotacao from './pages/vendedor/VendedorCotacao';
import VendedorOrcamento from './pages/vendedor/VendedorOrcamento';
import VendedorOrcamentos from './pages/vendedor/VendedorOrcamentos';
import VendedorMilhas from './pages/vendedor/VendedorMilhas';
import VendedorCarreira from './pages/vendedor/VendedorCarreira';
import VendedorInformacoes from './pages/vendedor/VendedorInformacoes';

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
              <ProtectedRoute allowedRoles={['admin', 'vendedor']}>
                <Layout />
              </ProtectedRoute>
            }>
              {/* === ROTAS ADMIN ONLY === */}
              <Route path="/" element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <Dashboard />
                </ProtectedRoute>
              } />
              <Route path="/contratos" element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <Contractors />
                </ProtectedRoute>
              } />
              <Route path="/contratos/:id" element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <ContractorDetail />
                </ProtectedRoute>
              } />
              <Route path="/projetos" element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <ProjectKanban />
                </ProtectedRoute>
              } />
              <Route path="/metas" element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <Goals />
                </ProtectedRoute>
              } />
              <Route path="/rituais" element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <Rituals />
                </ProtectedRoute>
              } />
              <Route path="/configuracoes" element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <Settings />
                </ProtectedRoute>
              } />
              <Route path="/usuarios" element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <UserManagement />
                </ProtectedRoute>
              } />

              {/* === PORTAL DO GERENTE (admin only) === */}
              <Route path="/gerente/metas" element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <GerenteMetasComerciais />
                </ProtectedRoute>
              } />
              <Route path="/gerente/vendedores" element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <GerenteVendedores />
                </ProtectedRoute>
              } />
              <Route path="/gerente/vendedores/:id" element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <GerenteVendedorDetalhe />
                </ProtectedRoute>
              } />
              <Route path="/gerente/clientes" element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <GerenteClientes />
                </ProtectedRoute>
              } />
              <Route path="/gerente/clientes/:id" element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <GerenteClienteDetalhe />
                </ProtectedRoute>
              } />
              <Route path="/gerente/orcamentos" element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <GerenteOrcamentos />
                </ProtectedRoute>
              } />

              {/* === PORTAL DO VENDEDOR (admin + vendedor) === */}
              <Route path="/vendedor/ferramentas" element={<VendedorFerramentas />} />
              <Route path="/vendedor/cotacao" element={<VendedorCotacao />} />
              <Route path="/vendedor/orcamento" element={<VendedorOrcamento />} />
              <Route path="/vendedor/orcamentos" element={<VendedorOrcamentos />} />
              <Route path="/vendedor/milhas" element={<VendedorMilhas />} />
              <Route path="/vendedor/carreira" element={<VendedorCarreira />} />
              <Route path="/vendedor/informacoes" element={<VendedorInformacoes />} />

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
