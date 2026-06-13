import { lazy, Suspense } from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClientInstance } from "@/shared/lib/query-client";
import { Toaster } from "@/shared/ui/toaster";
import Layout from "@/shared/components/Layout";
import { AuthProvider } from "@/features/auth/AuthContext";
import { ProtectedRoute } from "@/features/auth/ProtectedRoute";
import { routes } from "./routes";

const Login = lazy(() => import("@/features/auth/Login"));
const PageNotFound = lazy(() => import("@/shared/components/PageNotFound"));

// Resolve os componentes lazy UMA vez no load do módulo — chamar lazy() dentro
// do render recriaria o componente a cada render e remontaria a página.
const LAZY_ROUTES = routes.map((r) => ({ ...r, Component: lazy(r.page) }));

// Fallback de carregamento — mesmo spinner do ProtectedRoute, sem flash de layout.
function RouteFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClientInstance}>
      <AuthProvider>
        <Router>
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              {/* Login — sem layout, sem proteção */}
              <Route path="/login" element={<Login />} />

              {/* Rotas protegidas dentro do Layout */}
              <Route
                element={
                  <ProtectedRoute allowedRoles={["admin", "gerente", "vendedor", "parceiro", "suporte"]}>
                    <Layout />
                  </ProtectedRoute>
                }
              >
                {LAZY_ROUTES.map(({ path, roles, Component }) => (
                  <Route
                    key={path}
                    path={path}
                    element={
                      <ProtectedRoute allowedRoles={roles}>
                        <Component />
                      </ProtectedRoute>
                    }
                  />
                ))}

                <Route path="*" element={<PageNotFound />} />
              </Route>
            </Routes>
          </Suspense>
          <Toaster />
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
