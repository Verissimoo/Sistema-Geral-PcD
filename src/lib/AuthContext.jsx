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
    const cleanUser = String(username || "").trim().toLowerCase();
    const cleanPass = String(password || "").trim();
    try {
      // 1. Tenta autenticar como user (admin/vendedor)
      const { data: userData } = await supabase
        .from("pcd_users")
        .select("*")
        .eq("username", cleanUser)
        .eq("password", cleanPass)
        .eq("status", "Ativo")
        .maybeSingle();

      if (userData) {
        const session = {
          id: userData.id,
          username: userData.username,
          name: userData.name,
          role: userData.role,
          career_level: userData.career_level || "N0",
        };
        localStorage.setItem("pcd_session", JSON.stringify(session));
        setUser(session);
        return { success: true };
      }

      // 2. Se não achou em users, tenta como parceiro
      const { data: partnerData } = await supabase
        .from("pcd_partners")
        .select("*")
        .eq("username", cleanUser)
        .eq("password", cleanPass)
        .eq("status", "Ativo")
        .maybeSingle();

      if (partnerData) {
        const session = {
          id: partnerData.id,
          username: partnerData.username,
          name: partnerData.name,
          role: "parceiro",
          phone: partnerData.phone,
          email: partnerData.email,
          company: partnerData.company,
        };
        localStorage.setItem("pcd_session", JSON.stringify(session));
        setUser(session);
        return { success: true };
      }

      // 3. Nenhum dos dois → erro
      return { success: false, error: "Usuário ou senha inválidos" };
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
  const isParceiro = user?.role === "parceiro";
  const isSuporte = user?.role === "suporte";

  return (
    <AuthContext.Provider
      value={{ user, login, logout, loading, isAdmin, isVendedor, isParceiro, isSuporte }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
