import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

export function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    if (user.role === "vendedor") {
      return <Navigate to="/vendedor/ferramentas" replace />;
    }
    if (user.role === "suporte") {
      return <Navigate to="/suporte/emissoes" replace />;
    }
    if (user.role === "parceiro") {
      return <Navigate to="/parceiro/orcamentos" replace />;
    }
    return <Navigate to="/" replace />;
  }

  return children;
}
