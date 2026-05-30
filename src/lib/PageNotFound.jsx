import { useLocation } from 'react-router-dom';

export default function PageNotFound() {
  const location = useLocation();
  const pageName = location.pathname.substring(1);
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-bg-elevated">
      <div className="max-w-md w-full">
        <div className="text-center space-y-6">
          <h1 className="text-7xl font-light text-text-muted">404</h1>
          <h2 className="text-2xl font-medium text-text-secondary">Página não encontrada</h2>
          <p className="text-text-secondary leading-relaxed">
            A página "{pageName}" não existe.
          </p>
          <button 
            onClick={() => window.location.href = '/'}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-text-secondary bg-bg-surface border border-border rounded-lg hover:bg-bg-elevated transition-colors"
          >
            Voltar ao início
          </button>
        </div>
      </div>
    </div>
  );
}