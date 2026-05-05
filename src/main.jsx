import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'
import { seedMilesIfEmpty, seedAdminUser, seedCommercialGoals } from '@/api/localClient'

// Migração do seed de metas: se a meta de Maio não existe (seed antigo),
// limpa para que seedCommercialGoals re-popule com a escada correta.
const __existingGoals = JSON.parse(localStorage.getItem('pcd_commercial_goals') || '[]');
const __hasMay = __existingGoals.some((g) => g.month === '2026-05');
if (!__hasMay) {
  localStorage.removeItem('pcd_commercial_goals');
}

// Seed dos dados antes do render
seedMilesIfEmpty();
// Limpa qualquer pcd_users legado do localStorage — usuários agora vivem no Supabase.
seedAdminUser();
seedCommercialGoals();

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)
