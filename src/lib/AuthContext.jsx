import { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedSession = localStorage.getItem("pcd_session");
    if (savedSession) {
      try {
        const parsed = JSON.parse(savedSession);
        setUser(parsed);
      } catch {
        localStorage.removeItem("pcd_session");
      }
    }
    setLoading(false);
  }, []);

  const login = (username, password) => {
    const users = JSON.parse(localStorage.getItem("pcd_users") || "[]");
    const found = users.find(
      (u) =>
        u.username === username &&
        u.password === password &&
        u.status === "Ativo"
    );
    if (!found) return { success: false, error: "Usuário ou senha inválidos" };
    const session = {
      id: found.id,
      username: found.username,
      name: found.name,
      role: found.role,
    };
    localStorage.setItem("pcd_session", JSON.stringify(session));
    setUser(session);
    return { success: true };
  };

  const logout = () => {
    localStorage.removeItem("pcd_session");
    setUser(null);
  };

  const isAdmin = user?.role === "admin";
  const isVendedor = user?.role === "vendedor";

  return (
    <AuthContext.Provider
      value={{ user, login, logout, loading, isAdmin, isVendedor }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
