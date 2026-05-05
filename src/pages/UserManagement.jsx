import { useState, useEffect, useMemo } from "react";
import {
  Users, UserPlus, Pencil, ShieldCheck, ShieldOff, Lock,
  Crown, AlertCircle, Eye, EyeOff,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { localClient } from "@/api/localClient";
import { CAREER_LEVELS } from "@/lib/careerPlan";

const ADMIN_USERNAME = "admin";

const initials = (name = "") =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

const fmtDate = (iso) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });
};

export default function UserManagement() {
  const { toast } = useToast();
  const [users, setUsers] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: "", username: "", password: "", confirm: "", status: "Ativo", career_level: "N0" });
  const [showPwd, setShowPwd] = useState(false);
  const [formError, setFormError] = useState("");

  const reload = () => setUsers(localClient.entities.Users.list());
  useEffect(() => { reload(); }, []);

  const metrics = useMemo(() => {
    const total = users.length;
    const vendedoresAtivos = users.filter((u) => u.role === "vendedor" && u.status === "Ativo").length;
    const admins = users.filter((u) => u.role === "admin").length;
    return { total, vendedoresAtivos, admins };
  }, [users]);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", username: "", password: "", confirm: "", status: "Ativo", career_level: "N0" });
    setFormError("");
    setShowPwd(false);
    setDialogOpen(true);
  };

  const openEdit = (u) => {
    setEditing(u);
    setForm({
      name: u.name,
      username: u.username,
      password: "",
      confirm: "",
      status: u.status,
      career_level: u.career_level || "N0",
    });
    setFormError("");
    setShowPwd(false);
    setDialogOpen(true);
  };

  const validate = () => {
    if (!form.name.trim()) return "Nome é obrigatório";
    const username = form.username.trim().toLowerCase();
    if (!username) return "Nome de usuário é obrigatório";
    if (/\s/.test(username)) return "Nome de usuário não pode conter espaços";
    if (username === ADMIN_USERNAME && (!editing || editing.username !== ADMIN_USERNAME)) {
      return "Username 'admin' é reservado";
    }
    const conflict = users.find(
      (u) => u.username === username && (!editing || u.id !== editing.id)
    );
    if (conflict) return "Já existe um usuário com esse username";
    if (!editing && !form.password) return "Senha é obrigatória ao criar";
    if (form.password && form.password !== form.confirm) return "Senhas não conferem";
    return null;
  };

  const handleSave = () => {
    const err = validate();
    if (err) {
      setFormError(err);
      return;
    }
    const username = form.username.trim().toLowerCase();
    if (editing) {
      const updates = {
        name: form.name.trim(),
        username,
        status: form.status,
      };
      if (editing.role !== "admin") updates.career_level = form.career_level;
      if (form.password) updates.password = form.password;
      localClient.entities.Users.update(editing.id, updates);
      toast({ title: "Usuário atualizado", description: form.name });
    } else {
      const created = localClient.entities.Users.create({
        name: form.name.trim(),
        username,
        password: form.password,
        role: "vendedor",
        status: form.status || "Ativo",
        career_level: form.career_level,
        created_date: new Date().toISOString(),
      });
      toast({
        title: "Vendedor criado",
        description: `Usuário "${created.username}" — status: ${created.status}. Pode fazer login imediatamente neste navegador.`,
      });
    }
    setDialogOpen(false);
    reload();
  };

  const toggleStatus = (u) => {
    const next = u.status === "Ativo" ? "Inativo" : "Ativo";
    if (next === "Inativo" && !confirm(`Desativar ${u.name}?`)) return;
    localClient.entities.Users.update(u.id, { status: next });
    toast({ title: `Usuário ${next.toLowerCase()}`, description: u.name });
    reload();
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 rounded-lg bg-primary/10">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Gestão de Usuários</h1>
          </div>
          <p className="text-muted-foreground text-sm ml-12">
            Crie e gerencie os acessos dos vendedores ao sistema
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <UserPlus className="h-4 w-4" /> Novo Vendedor
        </Button>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <SummaryCard icon={<Users className="h-4 w-4" />} label="Total de usuários" value={metrics.total} />
        <SummaryCard
          icon={<ShieldCheck className="h-4 w-4 text-emerald-600" />}
          label="Vendedores ativos"
          value={metrics.vendedoresAtivos}
        />
        <SummaryCard
          icon={<Crown className="h-4 w-4 text-[#0B1E3D]" />}
          label="Administradores"
          value={metrics.admins}
        />
      </div>

      {/* Lista */}
      <div className="space-y-2">
        {users.map((u) => {
          const isSystemAdmin = u.username === ADMIN_USERNAME;
          return (
            <Card key={u.id} className="border-border/50">
              <CardContent className="p-4 flex items-center gap-4 flex-wrap">
                <div className="h-11 w-11 rounded-full bg-primary/10 flex items-center justify-center font-bold text-sm shrink-0 text-primary">
                  {initials(u.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm">{u.name}</span>
                    {isSystemAdmin && (
                      <Badge className="bg-muted text-muted-foreground hover:bg-muted gap-1">
                        <Lock className="h-3 w-3" /> Conta do sistema
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    @{u.username} · criado em {fmtDate(u.created_date)}
                  </div>
                </div>
                <Badge
                  className={cn(
                    "border",
                    u.role === "admin"
                      ? "bg-[#0B1E3D] text-white border-transparent hover:bg-[#0B1E3D]"
                      : "bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100"
                  )}
                >
                  {u.role === "admin" ? "Admin" : "Vendedor"}
                </Badge>
                <Badge
                  className={cn(
                    "border",
                    u.status === "Ativo"
                      ? "bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                      : "bg-red-100 text-red-700 border-red-200 hover:bg-red-100"
                  )}
                >
                  {u.status}
                </Badge>
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => openEdit(u)}
                    disabled={isSystemAdmin}
                    className="gap-1.5"
                  >
                    <Pencil className="h-3.5 w-3.5" /> Editar
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => toggleStatus(u)}
                    disabled={isSystemAdmin}
                    className={cn(
                      "gap-1.5",
                      u.status === "Ativo" ? "text-red-600 hover:text-red-700" : "text-emerald-600 hover:text-emerald-700"
                    )}
                  >
                    {u.status === "Ativo" ? <ShieldOff className="h-3.5 w-3.5" /> : <ShieldCheck className="h-3.5 w-3.5" />}
                    {u.status === "Ativo" ? "Desativar" : "Ativar"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {users.length === 0 && (
          <Card className="border-border/50">
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              Nenhum usuário cadastrado.
            </CardContent>
          </Card>
        )}
      </div>

      {/* Dialog criar/editar */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar vendedor" : "Novo vendedor"}</DialogTitle>
            <DialogDescription>
              {editing
                ? "Atualize os dados do vendedor. Deixe a senha em branco para manter a atual."
                : "Crie um novo acesso para a equipe comercial."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-1">
            <div className="space-y-1.5">
              <Label htmlFor="u-name">Nome completo</Label>
              <Input
                id="u-name"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="Ex: João Silva"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="u-username">Nome de usuário</Label>
              <Input
                id="u-username"
                value={form.username}
                onChange={(e) =>
                  setForm((p) => ({ ...p, username: e.target.value.replace(/\s/g, "").toLowerCase() }))
                }
                placeholder="Ex: joao"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="u-password">
                  Senha {editing && <span className="text-muted-foreground text-xs">(opcional)</span>}
                </Label>
                <div className="relative">
                  <Input
                    id="u-password"
                    type={showPwd ? "text" : "password"}
                    value={form.password}
                    onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                    className="pr-9"
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
              <div className="space-y-1.5">
                <Label htmlFor="u-confirm">Confirmar senha</Label>
                <Input
                  id="u-confirm"
                  type={showPwd ? "text" : "password"}
                  value={form.confirm}
                  onChange={(e) => setForm((p) => ({ ...p, confirm: e.target.value }))}
                />
              </div>
            </div>
            {(!editing || editing.role !== "admin") && (
              <div className="space-y-1.5">
                <Label htmlFor="u-career">Nível de Carreira</Label>
                <Select
                  value={form.career_level}
                  onValueChange={(v) => setForm((p) => ({ ...p, career_level: v }))}
                >
                  <SelectTrigger id="u-career">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CAREER_LEVELS.map((l) => (
                      <SelectItem key={l.level} value={l.level}>
                        {l.level} — {l.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Use para promover manualmente o vendedor conforme avaliação.
                </p>
              </div>
            )}

            <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30">
              <div>
                <div className="font-medium text-sm">Status</div>
                <div className="text-xs text-muted-foreground">
                  Usuário inativo não consegue fazer login.
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant={form.status === "Ativo" ? "default" : "outline"}
                  onClick={() => setForm((p) => ({ ...p, status: "Ativo" }))}
                >
                  Ativo
                </Button>
                <Button
                  size="sm"
                  variant={form.status === "Inativo" ? "default" : "outline"}
                  onClick={() => setForm((p) => ({ ...p, status: "Inativo" }))}
                >
                  Inativo
                </Button>
              </div>
            </div>

            {formError && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                {formError}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>{editing ? "Salvar" : "Criar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SummaryCard({ icon, label, value }) {
  return (
    <Card className="border-border/50">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
          {icon}
          <span>{label}</span>
        </div>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}
