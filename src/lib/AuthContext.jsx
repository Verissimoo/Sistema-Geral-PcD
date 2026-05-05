import { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

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

  const login = async (username, password) => {
    const normalizedUsername = String(username || "").trim().toLowerCase();
    const inputPassword = String(password || "").trim();
    try {
      const { data, error } = await supabase
        .from("pcd_users")
        .select("*")
        .eq("username", normalizedUsername)
        .eq("password", inputPassword)
        .eq("status", "Ativo")
        .single();

      if (error || !data) {
        return { success: false, error: "Usuário ou senha inválidos" };
      }

      const session = {
        id: data.id,
        username: data.username,
        name: data.name,
        role: data.role,
        career_level: data.career_level || "N0",
      };
      localStorage.setItem("pcd_session", JSON.stringify(session));
      setUser(session);
      return { success: true };
    } catch (err) {
      console.error("Erro no login:", err);
      return { success: false, error: "Erro ao conectar. Tente novamente." };
    }
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
