import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'
import { seedMilesIfEmpty, seedAdminUser, seedCommercialGoals } from '@/api/localClient'

// Limpa resíduos do storage antigo (dados agora vivem no Supabase).
const LEGACY_KEYS = [
  'pcd_users',
  'pcd_clients',
  'pcd_quotes',
  'pcd_miles_table',
  'pcd_commercial_goals',
  'pcd_rituals',
  'pcd_contractors',
  'pcd_projects',
  'pcd_sellers',
];
LEGACY_KEYS.forEach((k) => {
  try { localStorage.removeItem(k); } catch { /* ignore */ }
});

async function bootstrap() {
  // Seeds rodam em paralelo — cada um verifica se já existe antes de inserir.
  await Promise.all([
    seedAdminUser(),
    seedMilesIfEmpty(),
    seedCommercialGoals(),
  ]).catch((err) => console.error('Erro nos seeds iniciais:', err));

  ReactDOM.createRoot(document.getElementById('root')).render(<App />);
}

bootstrap();
