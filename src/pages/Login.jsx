import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { User, Lock, Eye, EyeOff, AlertCircle, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/lib/AuthContext";

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const userRef = useRef(null);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    userRef.current?.focus();
  }, []);

  useEffect(() => {
    if (user) {
      if (user.role === "admin") navigate("/", { replace: true });
      else if (user.role === "vendedor") navigate("/vendedor/ferramentas", { replace: true });
      else if (user.role === "suporte") navigate("/suporte/emissoes", { replace: true });
      else if (user.role === "parceiro") navigate("/parceiro/orcamentos", { replace: true });
    }
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setError("");
    setSubmitting(true);

    try {
      const result = await login(username.trim(), password);
      if (!result.success) {
        setError(result.error || "Erro ao entrar");
        setSubmitting(false);
        return;
      }
      // success — redirect handled by effect above when user state updates
    } catch (err) {
      console.error(err);
      setError("Erro ao entrar");
      setSubmitting(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-10"
      style={{
        background: "linear-gradient(135deg, hsl(224 80% 14%) 0%, hsl(224 60% 22%) 100%)",
      }}
    >
      <div className="w-full max-w-[420px] bg-white rounded-2xl shadow-2xl p-10">
        {/* Logo */}
        <div className="text-center mb-1">
          <div className="text-2xl font-extrabold tracking-tight" style={{ letterSpacing: "-0.3px" }}>
            <span style={{ color: "#0B1E3D" }}>Passagens</span>
            <span style={{ color: "#CC1B1B" }}>Com</span>
            <span style={{ color: "#0B1E3D" }}>Desconto</span>
          </div>
          <div
            className="text-[11px] uppercase mt-1"
            style={{ color: "#6B7BA0", letterSpacing: "3px", fontWeight: 500 }}
          >
            Sistema Interno
          </div>
        </div>

        <Separator className="my-6" />

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="username" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Usuário
            </Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="username"
                ref={userRef}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Digite seu usuário"
                autoComplete="username"
                className="pl-9 h-11"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Senha
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
                type={showPwd ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Digite sua senha"
                autoComplete="current-password"
                className="pl-9 pr-10 h-11"
              />
              <button
                type="button"
                onClick={() => setShowPwd((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                tabIndex={-1}
              >
                {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <Button
            type="submit"
            disabled={submitting || !username || !password}
            className="w-full h-11 font-semibold gap-2"
            style={{ background: "#0B1E3D" }}
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Entrando...
              </>
            ) : (
              "Entrar"
            )}
          </Button>
        </form>

        <div className="text-center text-[11px] text-muted-foreground mt-8">
          PassagensComDesconto © 2026
        </div>
      </div>
    </div>
  );
}
