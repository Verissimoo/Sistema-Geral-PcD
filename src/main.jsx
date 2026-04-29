import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'
import { seedMilesIfEmpty, seedAdminUser, seedCommercialGoals } from '@/api/localClient'

// Seed dos dados antes do render
seedMilesIfEmpty();
seedAdminUser();
seedCommercialGoals();

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)
