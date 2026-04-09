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

function App() {
  return (
    <QueryClientProvider client={queryClientInstance}>
      <Router>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/contratos" element={<Contractors />} />
            <Route path="/contratos/:id" element={<ContractorDetail />} />
            <Route path="/projetos" element={<ProjectKanban />} />
            <Route path="/metas" element={<Goals />} />
            <Route path="/rituais" element={<Rituals />} />
            <Route path="/configuracoes" element={<Settings />} />
            <Route path="*" element={<PageNotFound />} />
          </Route>
        </Routes>
        <Toaster />
      </Router>
    </QueryClientProvider>
  )
}

export default App